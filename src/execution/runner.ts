/**
 * Execution Runner
 *
 * Main orchestration loop for running agents with automatic fallback
 */

import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import chalk from "chalk";
import type { AgentAdapter, AgentName } from "../agents/types";
import { getAgent, getInstalledAgents } from "../agents/registry";
import type { RelentlessConfig } from "../config/schema";
import { loadConstitution, validateConstitution } from "../config/loader";
import { loadPRD, getNextStory, isComplete, countStories, markStoryAsSkipped } from "../prd";
import type { UserStory } from "../prd/types";
import { loadProgress, updateProgressMetadata, syncPatternsFromContent, appendProgress } from "../prd/progress";
import { routeStory } from "./router";
import { buildStoryPromptAddition } from "./story-prompt";
import { processQueue } from "../queue";
import type { QueueProcessResult } from "../queue/types";
import {
  shouldPause,
  executePauseAction,
  logPauseToProgress,
  formatPauseMessage,
  shouldAbort,
  logAbortToProgress,
  formatAbortMessage,
  generateAbortSummary,
  shouldSkip,
  getSkipCommands,
  handleSkipCommand,
  logSkipToProgress,
  logSkipRejectedToProgress,
  formatSkipMessage,
} from "./commands";

export interface RunOptions {
  /** Agent to use (or "auto" for smart routing) */
  agent: AgentName | "auto";
  /** Maximum iterations */
  maxIterations: number;
  /** Working directory */
  workingDirectory: string;
  /** Path to prd.json */
  prdPath: string;
  /** Path to prompt.md */
  promptPath: string;
  /** Dry run (don't execute) */
  dryRun: boolean;
  /** Configuration */
  config: RelentlessConfig;
  /** Cost optimization mode */
  mode?: "free" | "cheap" | "good" | "genius";
  /** Harness fallback order */
  fallbackOrder?: ("claude" | "codex" | "droid" | "opencode" | "amp" | "gemini")[];
}

export interface RunResult {
  /** Whether all stories completed */
  success: boolean;
  /** Number of iterations executed */
  iterations: number;
  /** Stories completed */
  storiesCompleted: number;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Track rate limit state for agents
 */
interface AgentLimitState {
  /** When the limit resets */
  resetTime?: Date;
  /** When we detected the limit */
  detectedAt: Date;
}

/**
 * Process queue items for an iteration
 *
 * Reads pending queue items and processes them.
 * This is called at the start of each iteration.
 *
 * @param featurePath - Path to the feature directory
 * @returns QueueProcessResult with prompts, commands, and warnings
 */
export async function processQueueForIteration(
  featurePath: string
): Promise<QueueProcessResult> {
  return processQueue(featurePath);
}

/**
 * Inject queue prompts into the agent prompt
 *
 * Adds a "Queued User Guidance" section to the prompt with
 * numbered list of user messages from the queue.
 *
 * @param basePrompt - The original prompt
 * @param prompts - Queue prompts to inject
 * @returns Modified prompt with queue guidance section
 */
export function injectQueuePrompts(basePrompt: string, prompts: string[]): string {
  if (prompts.length === 0) {
    return basePrompt;
  }

  const numberedList = prompts.map((p, i) => `${i + 1}. ${p}`).join("\n");

  const queueSection = `

## Queued User Guidance

The following messages were queued by the user during the run. Please incorporate this guidance into your work:

${numberedList}

---
`;

  return basePrompt + queueSection;
}

/**
 * Acknowledge queue processing in progress.txt
 *
 * Appends a note about processed queue items to the progress log.
 *
 * @param progressPath - Path to progress.txt
 * @param prompts - Prompts that were processed
 */
export async function acknowledgeQueueInProgress(
  progressPath: string,
  prompts: string[]
): Promise<void> {
  if (prompts.length === 0) {
    return;
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `
## Queue Processed - ${timestamp}

Acknowledged ${prompts.length} queued message(s):
${prompts.map((p) => `- ${p}`).join("\n")}

---
`;

  await appendProgress(progressPath, entry);
}

/**
 * Format queue log message for console output
 *
 * @param promptCount - Number of prompts in queue
 * @param commandCount - Number of commands in queue
 * @returns Formatted log message
 */
export function formatQueueLogMessage(promptCount: number, commandCount: number): string {
  const total = promptCount + commandCount;

  if (total === 0) {
    return "";
  }

  const itemWord = total === 1 ? "item" : "items";
  let message = `Processing ${total} queue ${itemWord}...`;

  if (commandCount > 0) {
    const cmdWord = commandCount === 1 ? "command" : "commands";
    message = `Processing ${total} queue ${itemWord} (${commandCount} ${cmdWord})...`;
  }

  return message;
}

/**
 * Build the prompt for an iteration
 */
async function buildPrompt(
  promptPath: string,
  workingDirectory: string,
  progressPath: string,
  story?: UserStory
): Promise<string> {
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  let prompt = await Bun.file(promptPath).text();

  // Load and append constitution if available (pass undefined to auto-find)
  const constitution = await loadConstitution();
  if (constitution) {
    // Validate constitution
    const validation = validateConstitution(constitution);
    if (!validation.valid) {
      console.warn(chalk.yellow("\n⚠️  Constitution validation warnings:"));
      for (const error of validation.errors) {
        console.warn(chalk.dim(`  - ${error}`));
      }
    }

    // Append constitution to prompt
    prompt += `\n\n## Project Constitution\n\n`;
    prompt += `The following principles and constraints govern this project.\n\n`;
    prompt += constitution.raw;
  }

  // Load and append progress patterns if available
  const progress = await loadProgress(progressPath);
  if (progress?.metadata?.patterns && progress.metadata.patterns.length > 0) {
    prompt += `\n\n## Learned Patterns from Previous Iterations\n\n`;
    prompt += `The following patterns were discovered in previous iterations:\n\n`;
    for (const pattern of progress.metadata.patterns) {
      prompt += `- ${pattern}\n`;
    }
  }

  // Load and append spec.md if available
  const specPath = join(dirname(progressPath), "spec.md");
  if (existsSync(specPath)) {
    const specContent = await Bun.file(specPath).text();
    prompt += `\n\n## Feature Specification\n\n`;
    prompt += `The following specification defines the requirements for this feature:\n\n`;
    prompt += specContent;
  }

  // Load and append plan.md if available
  const planPath = join(dirname(progressPath), "plan.md");
  if (existsSync(planPath)) {
    const planContent = await Bun.file(planPath).text();
    prompt += `\n\n## Technical Planning Document\n\n`;
    prompt += `The following technical plan has been created for this feature:\n\n`;
    prompt += planContent;
  }

  // Load and append tasks.md if available
  const tasksPath = join(dirname(progressPath), "tasks.md");
  if (existsSync(tasksPath)) {
    const tasksContent = await Bun.file(tasksPath).text();
    prompt += `\n\n## User Stories and Tasks\n\n`;
    prompt += `The following tasks file contains all user stories with their acceptance criteria.\n`;
    prompt += `**IMPORTANT:** Update the checkboxes in this file as you complete each criterion.\n`;
    prompt += `Change \`- [ ]\` to \`- [x]\` for completed items.\n\n`;
    prompt += tasksContent;
  }

  // Load and append checklist.md if available
  const checklistPath = join(dirname(progressPath), "checklist.md");
  if (existsSync(checklistPath)) {
    const checklistContent = await Bun.file(checklistPath).text();
    prompt += `\n\n## Quality Checklist\n\n`;
    prompt += `The following quality checks must be validated before marking stories as complete:\n\n`;
    prompt += checklistContent;
    prompt += `\n\nIMPORTANT: Review this checklist after implementing each story and verify all applicable items.\n`;
  }

  // Load and append research findings if available
  if (story?.id) {
    const researchPath = join(dirname(progressPath), "research", `${story.id}.md`);
    if (existsSync(researchPath)) {
      const researchContent = await Bun.file(researchPath).text();
      prompt += `\n\n## Research Findings for ${story.id}\n\n`;
      prompt += `The following research was conducted before implementation:\n\n`;
      prompt += researchContent;
    }
  }

  // Add story-specific workflow instructions
  if (story) {
    const featureDir = dirname(progressPath);
    const storyInstructions = await buildStoryPromptAddition(story, featureDir);
    prompt += storyInstructions;
  }

  return prompt;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an agent's rate limit has reset
 */
function hasLimitReset(state: AgentLimitState): boolean {
  if (state.resetTime) {
    return new Date() >= state.resetTime;
  }
  // If no reset time known, assume 1 hour from detection
  const oneHourAfter = new Date(state.detectedAt.getTime() + 60 * 60 * 1000);
  return new Date() >= oneHourAfter;
}

/**
 * Get the next available agent from the fallback priority list
 */
async function getNextAvailableAgent(
  priority: AgentName[],
  limitedAgents: Map<AgentName, AgentLimitState>,
  preferredAgent?: AgentName
): Promise<AgentAdapter | null> {
  // Get installed agents
  const installed = await getInstalledAgents();
  const installedNames = new Set(installed.map((a) => a.name));

  // If preferred agent is available and not limited, use it
  if (preferredAgent && installedNames.has(preferredAgent)) {
    const state = limitedAgents.get(preferredAgent);
    if (!state || hasLimitReset(state)) {
      // Clear the limit if it has reset
      if (state && hasLimitReset(state)) {
        limitedAgents.delete(preferredAgent);
      }
      return getAgent(preferredAgent);
    }
  }

  // Find first available agent in priority order
  for (const name of priority) {
    if (!installedNames.has(name)) {
      continue; // Agent not installed
    }

    const state = limitedAgents.get(name);
    if (!state) {
      return getAgent(name); // Not limited
    }

    if (hasLimitReset(state)) {
      limitedAgents.delete(name); // Limit has reset
      return getAgent(name);
    }
  }

  return null; // All agents are rate limited
}

/**
 * Format time until reset
 */
function formatTimeUntilReset(resetTime: Date): string {
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "now";
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Run the orchestration loop with automatic agent fallback
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const startTime = Date.now();
  let iterations = 0;
  let storiesCompleted = 0;

  // Track rate-limited agents
  const limitedAgents = new Map<AgentName, AgentLimitState>();

  // Current active agent
  let _currentAgentName: AgentName | null = options.agent === "auto" ? null : options.agent;

  // Load PRD
  if (!existsSync(options.prdPath)) {
    throw new Error(`PRD file not found: ${options.prdPath}`);
  }
  const prd = await loadPRD(options.prdPath);
  const initialCount = countStories(prd);

  // Calculate progress.txt path
  const prdDir = dirname(options.prdPath);
  const progressPath = join(prdDir, "progress.txt");

  console.log(chalk.bold.blue("\n🚀 Relentless - Universal AI Agent Orchestrator\n"));
  console.log(`Project: ${chalk.cyan(prd.project)}`);
  console.log(`Branch: ${chalk.cyan(prd.branchName)}`);
  console.log(`Stories: ${chalk.green(initialCount.completed)}/${initialCount.total} complete`);
  console.log(`Max iterations: ${chalk.yellow(options.maxIterations)}`);

  if (options.config.fallback.enabled) {
    console.log(`Fallback: ${chalk.green("enabled")} (${options.config.fallback.priority.join(" → ")})`);
  }

  if (options.dryRun) {
    console.log(chalk.yellow("\n⚠️  Dry run mode - not executing\n"));
  }

  // Main loop
  for (let i = 1; i <= options.maxIterations; i++) {
    iterations = i;

    // Reload PRD to get latest status
    const currentPRD = await loadPRD(options.prdPath);

    // Check if complete
    if (isComplete(currentPRD)) {
      console.log(chalk.green.bold("\n✅ All stories complete!"));
      break;
    }

    // Get next story
    const story = getNextStory(currentPRD);
    if (!story) {
      console.log(chalk.green.bold("\n✅ No more stories to work on!"));
      break;
    }

    // Select agent
    let agent: AgentAdapter | null = null;

    if (options.agent === "auto") {
      // Smart routing
      const routedName = routeStory(story, options.config.routing);
      agent = await getNextAvailableAgent(
        options.config.fallback.priority,
        limitedAgents,
        routedName
      );
      if (agent) {
        _currentAgentName = agent.name;
      }
    } else if (options.config.fallback.enabled) {
      // Use fallback if enabled
      agent = await getNextAvailableAgent(
        options.config.fallback.priority,
        limitedAgents,
        options.agent
      );
      if (agent) {
        _currentAgentName = agent.name;
      }
    } else {
      // Use specified agent without fallback
      agent = getAgent(options.agent);
      _currentAgentName = options.agent;
    }

    // Check if we have an available agent
    if (!agent) {
      console.log(chalk.red.bold("\n❌ All agents are rate limited!"));

      // Show when limits reset
      for (const [name, state] of limitedAgents) {
        if (state.resetTime) {
          console.log(chalk.dim(`  ${name}: resets in ${formatTimeUntilReset(state.resetTime)}`));
        } else {
          console.log(chalk.dim(`  ${name}: rate limited (reset time unknown)`));
        }
      }

      // Find earliest reset time and wait
      const earliestReset = Array.from(limitedAgents.values())
        .filter((s) => s.resetTime)
        .sort((a, b) => (a.resetTime?.getTime() ?? 0) - (b.resetTime?.getTime() ?? 0))[0];

      if (earliestReset?.resetTime) {
        const waitMs = earliestReset.resetTime.getTime() - Date.now();
        if (waitMs > 0 && waitMs < 60 * 60 * 1000) {
          // Wait up to 1 hour
          console.log(chalk.yellow(`\n⏳ Waiting ${formatTimeUntilReset(earliestReset.resetTime)} for rate limit to reset...`));
          await sleep(waitMs + 1000); // Add 1 second buffer
          continue; // Retry the iteration
        }
      }

      // Can't continue
      console.log(chalk.yellow("\nStopping - no agents available and reset time too far."));
      break;
    }

    // Print iteration header
    console.log(chalk.bold(`\n${"═".repeat(60)}`));
    console.log(chalk.bold(`  Iteration ${i} of ${options.maxIterations}`));
    console.log(chalk.bold(`  Agent: ${chalk.cyan(agent.displayName)}`));
    console.log(chalk.bold(`  Story: ${chalk.yellow(story.id)} - ${story.title}`));
    console.log(chalk.bold(`${"═".repeat(60)}\n`));

    // Process queue at start of iteration
    const featureDir = dirname(options.prdPath);
    let queuePrompts: string[] = [];
    try {
      const queueResult = await processQueueForIteration(featureDir);
      queuePrompts = queueResult.prompts;

      // Log if there are queue items (silent for empty queue)
      const logMessage = formatQueueLogMessage(queueResult.prompts.length, queueResult.commands.length);
      if (logMessage) {
        console.log(chalk.cyan(`  📬 ${logMessage}`));
      }

      // Log warnings if any
      for (const warning of queueResult.warnings) {
        console.log(chalk.yellow(`  ⚠️  ${warning}`));
      }

      // Acknowledge in progress.txt
      if (queueResult.prompts.length > 0 && existsSync(progressPath)) {
        await acknowledgeQueueInProgress(progressPath, queueResult.prompts);
      }

      // Handle PAUSE command
      if (shouldPause(queueResult.commands)) {
        console.log(chalk.yellow(`\n  ${formatPauseMessage()}`));

        // Log pause to progress.txt
        if (existsSync(progressPath)) {
          await logPauseToProgress(progressPath);
        }

        // Wait for user input
        await executePauseAction();
        console.log(chalk.green("  ▶️  Resuming...\n"));
      }

      // Handle ABORT command
      if (shouldAbort(queueResult.commands)) {
        console.log(chalk.red(`\n  ${formatAbortMessage()}`));

        // Log abort to progress.txt
        if (existsSync(progressPath)) {
          await logAbortToProgress(progressPath);
        }

        // Calculate summary
        const currentPRDForAbort = await loadPRD(options.prdPath);
        const currentCount = countStories(currentPRDForAbort);
        const duration = Date.now() - startTime;

        // Show progress summary
        const summary = generateAbortSummary({
          storiesCompleted: currentCount.completed,
          storiesTotal: currentCount.total,
          iterations: i,
          duration,
        });
        console.log(chalk.dim(summary));

        // Return with success (clean exit)
        return {
          success: false, // Not all stories complete
          iterations: i,
          storiesCompleted: currentCount.completed - initialCount.completed,
          duration,
        };
      }

      // Handle SKIP command(s)
      if (shouldSkip(queueResult.commands)) {
        const skipCommands = getSkipCommands(queueResult.commands);
        for (const skipCmd of skipCommands) {
          // Check if trying to skip the current story in progress
          const action = handleSkipCommand(skipCmd.storyId, story.id);

          if (action.rejected) {
            // Log rejection to console and progress.txt
            console.log(chalk.yellow(`\n  ${formatSkipMessage(action.storyId, true)}`));
            if (existsSync(progressPath)) {
              await logSkipRejectedToProgress(progressPath, action.storyId);
            }
          } else {
            // Mark story as skipped in PRD
            const skipResult = await markStoryAsSkipped(options.prdPath, action.storyId);

            if (skipResult.success) {
              console.log(chalk.cyan(`\n  ${formatSkipMessage(action.storyId, false)}`));
              if (existsSync(progressPath)) {
                await logSkipToProgress(progressPath, action.storyId, action.customReason);
              }
            } else if (skipResult.error) {
              console.log(chalk.yellow(`\n  ⚠️  ${skipResult.error}`));
            }
          }
        }
      }

      // TODO: Handle PRIORITY command in future story (US-012)
    } catch (queueError) {
      console.warn(chalk.yellow(`  ⚠️  Queue processing error: ${queueError}`));
    }

    if (options.dryRun) {
      console.log(chalk.dim("  [Dry run - skipping execution]"));
      continue;
    }

    // Build and run prompt
    try {
      // Check if this story requires research phase
      const researchDir = join(dirname(options.prdPath), "research");
      const researchPath = join(researchDir, `${story.id}.md`);
      const needsResearch = story.research && !existsSync(researchPath);

      if (needsResearch) {
        // Phase 1: Research
        console.log(chalk.cyan("  📚 Research phase - gathering context and patterns..."));

        // Ensure research directory exists
        if (!existsSync(researchDir)) {
          mkdirSync(researchDir, { recursive: true });
        }

        let researchPrompt = await buildPrompt(options.promptPath, options.workingDirectory, progressPath, story);

        // Inject queue prompts into research phase too
        if (queuePrompts.length > 0) {
          researchPrompt = injectQueuePrompts(researchPrompt, queuePrompts);
        }

        const researchResult = await agent.invoke(researchPrompt, {
          workingDirectory: options.workingDirectory,
          dangerouslyAllowAll: options.config.agents[agent.name]?.dangerouslyAllowAll ?? true,
          model: options.config.agents[agent.name]?.model,
        });

        // Check for rate limit during research phase
        const researchRateLimit = agent.detectRateLimit(researchResult.output);
        if (researchRateLimit.limited) {
          console.log(chalk.yellow.bold(`\n⚠️ ${agent.displayName} rate limited during research!`));
          limitedAgents.set(agent.name, {
            resetTime: researchRateLimit.resetTime,
            detectedAt: new Date(),
          });
          if (options.config.fallback.enabled) {
            const fallbackAgent = await getNextAvailableAgent(
              options.config.fallback.priority,
              limitedAgents
            );
            if (fallbackAgent) {
              console.log(chalk.green(`  Switching to: ${fallbackAgent.displayName}`));
              _currentAgentName = fallbackAgent.name;
              await sleep(options.config.fallback.retryDelay);
              i--;
              continue;
            }
          }
          console.log(chalk.dim("  No fallback agents available."));
          continue;
        }

        console.log(chalk.green("  ✓ Research phase complete"));
        console.log(chalk.dim(`    Research findings saved to: research/${story.id}.md`));

        // Phase 2: Implementation
        console.log(chalk.cyan("  🔨 Implementation phase - applying research findings..."));
      }

      let prompt = await buildPrompt(options.promptPath, options.workingDirectory, progressPath, story);

      // Inject queue prompts if any
      if (queuePrompts.length > 0) {
        prompt = injectQueuePrompts(prompt, queuePrompts);
      }

      if (!needsResearch) {
        console.log(chalk.dim("  Running agent..."));
      }

      const result = await agent.invoke(prompt, {
        workingDirectory: options.workingDirectory,
        dangerouslyAllowAll: options.config.agents[agent.name]?.dangerouslyAllowAll ?? true,
        model: options.config.agents[agent.name]?.model,
      });

      // Check for rate limit
      const rateLimit = agent.detectRateLimit(result.output);
      if (rateLimit.limited) {
        console.log(chalk.yellow.bold(`\n⚠️ ${agent.displayName} rate limited!`));

        // Track the limit
        limitedAgents.set(agent.name, {
          resetTime: rateLimit.resetTime,
          detectedAt: new Date(),
        });

        if (rateLimit.resetTime) {
          console.log(chalk.dim(`  Resets at: ${rateLimit.resetTime.toLocaleTimeString()}`));
        }

        // Try to get fallback agent
        if (options.config.fallback.enabled) {
          const fallbackAgent = await getNextAvailableAgent(
            options.config.fallback.priority,
            limitedAgents
          );

          if (fallbackAgent) {
            console.log(chalk.green(`  Switching to: ${fallbackAgent.displayName}`));
            _currentAgentName = fallbackAgent.name;
            // Wait before retry
            await sleep(options.config.fallback.retryDelay);
            i--; // Retry this iteration with new agent
            continue;
          }
        }

        console.log(chalk.dim("  No fallback agents available."));
      }

      // Log output (truncated if too long)
      if (result.output) {
        const lines = result.output.split("\n");
        const preview = lines.slice(0, 20).join("\n");
        console.log(chalk.dim(preview));
        if (lines.length > 20) {
          console.log(chalk.dim(`  ... (${lines.length - 20} more lines)`));
        }
      }

      console.log(chalk.dim(`\n  Duration: ${(result.duration / 1000).toFixed(1)}s`));
      console.log(chalk.dim(`  Exit code: ${result.exitCode}`));

      // Check for completion signal
      if (result.isComplete) {
        console.log(chalk.green.bold("\n🎉 Agent signaled COMPLETE!"));

        // Reload and check if really complete
        const finalPRD = await loadPRD(options.prdPath);
        if (isComplete(finalPRD)) {
          storiesCompleted = countStories(finalPRD).completed - initialCount.completed;
          const duration = Date.now() - startTime;
          return { success: true, iterations, storiesCompleted, duration };
        }
      }

      // Count completed stories
      const updatedPRD = await loadPRD(options.prdPath);
      const updatedCount = countStories(updatedPRD);
      if (updatedCount.completed > initialCount.completed + storiesCompleted) {
        storiesCompleted = updatedCount.completed - initialCount.completed;
      }

      console.log(chalk.dim(`  Stories: ${updatedCount.completed}/${updatedCount.total} complete`));

      // Update progress metadata after each iteration
      if (existsSync(progressPath)) {
        try {
          // Sync patterns from content
          await syncPatternsFromContent(progressPath);

          // Update metadata
          await updateProgressMetadata(progressPath, {
            stories_completed: updatedCount.completed,
          });
        } catch (error) {
          console.warn(chalk.yellow(`  ⚠️  Failed to update progress metadata: ${error}`));
        }
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error in iteration ${i}:`), error);
      // Continue to next iteration
    }

    // Delay between iterations
    if (i < options.maxIterations) {
      await sleep(options.config.execution.iterationDelay);
    }
  }

  // Final check
  const finalPRD = await loadPRD(options.prdPath);
  const success = isComplete(finalPRD);
  const duration = Date.now() - startTime;

  if (!success) {
    console.log(chalk.yellow(`\n⚠️  Reached max iterations (${options.maxIterations}) without completing all stories.`));
    console.log(chalk.dim(`Check progress.txt for status.`));
  }

  return { success, iterations, storiesCompleted, duration };
}
