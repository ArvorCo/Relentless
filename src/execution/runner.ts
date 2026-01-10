/**
 * Execution Runner
 *
 * Main orchestration loop for running agents
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import type { AgentAdapter, AgentName } from "../agents/types";
import { getAgent, isValidAgentName } from "../agents/registry";
import type { RelentlessConfig } from "../config/schema";
import { loadPRD, savePRD, getNextStory, isComplete, countStories, type PRD } from "../prd";
import { routeStory } from "./router";

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
 * Build the prompt for an iteration
 */
async function buildPrompt(promptPath: string): Promise<string> {
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  return await Bun.file(promptPath).text();
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the orchestration loop
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const startTime = Date.now();
  let iterations = 0;
  let storiesCompleted = 0;

  // Load PRD
  if (!existsSync(options.prdPath)) {
    throw new Error(`PRD file not found: ${options.prdPath}`);
  }
  const prd = await loadPRD(options.prdPath);
  const initialCount = countStories(prd);

  console.log(chalk.bold.blue("\n🚀 Relentless - Universal AI Agent Orchestrator\n"));
  console.log(`Project: ${chalk.cyan(prd.project)}`);
  console.log(`Branch: ${chalk.cyan(prd.branchName)}`);
  console.log(`Stories: ${chalk.green(initialCount.completed)}/${initialCount.total} complete`);
  console.log(`Max iterations: ${chalk.yellow(options.maxIterations)}`);

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
    let agent: AgentAdapter;
    if (options.agent === "auto") {
      const agentName = routeStory(story, options.config.routing);
      agent = getAgent(agentName);
      console.log(chalk.dim(`\nSmart routing selected: ${agent.displayName}`));
    } else {
      agent = getAgent(options.agent);
    }

    // Print iteration header
    console.log(chalk.bold(`\n${"═".repeat(60)}`));
    console.log(chalk.bold(`  Iteration ${i} of ${options.maxIterations}`));
    console.log(chalk.bold(`  Agent: ${chalk.cyan(agent.displayName)}`));
    console.log(chalk.bold(`  Story: ${chalk.yellow(story.id)} - ${story.title}`));
    console.log(chalk.bold(`${"═".repeat(60)}\n`));

    if (options.dryRun) {
      console.log(chalk.dim("  [Dry run - skipping execution]"));
      continue;
    }

    // Build and run prompt
    try {
      const prompt = await buildPrompt(options.promptPath);

      console.log(chalk.dim("  Running agent..."));
      const result = await agent.invoke(prompt, {
        workingDirectory: options.workingDirectory,
        dangerouslyAllowAll: options.config.agents[agent.name]?.dangerouslyAllowAll ?? true,
        model: options.config.agents[agent.name]?.model,
      });

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
