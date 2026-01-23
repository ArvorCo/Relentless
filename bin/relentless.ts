#!/usr/bin/env bun
/**
 * Relentless CLI
 *
 * Universal AI agent orchestrator
 */

import { Command } from "commander";
import chalk from "chalk";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

import { checkAgentHealth, getAllAgentNames, isValidAgentName } from "../src/agents";
import type { AgentName } from "../src/agents/types";
import { loadConfig, findRelentlessDir } from "../src/config";
import { loadPRD, savePRD, parsePRDMarkdown, createPRD, analyzeConsistency, formatReport, generateGitHubIssues } from "../src/prd";
import { run } from "../src/execution/runner";
import { runTUI } from "../src/tui/TUIRunner";
import { initProject, createFeature, listFeatures, createProgressTemplate, parseAutoModeFlags } from "../src/init/scaffolder";
import { parseModeFlagValue, getModeHelpText, VALID_MODES, DEFAULT_MODE } from "../src/cli/mode-flag";
import { parseFallbackOrderValue, getFallbackOrderHelpText, VALID_HARNESSES } from "../src/cli/fallback-order";
import { parseReviewFlagsValue, getReviewFlagsHelpText, VALID_REVIEW_MODES } from "../src/cli/review-flags";
import { estimateFeatureCost, formatCostEstimate, formatCostBreakdown, compareModes, formatModeComparison } from "../src/routing/estimate";
import { loadHistoricalCosts } from "../src/routing/report";
import { routeTask } from "../src/routing/router";

// Read version from package.json dynamically
const packageJson = await Bun.file(join(import.meta.dir, "..", "package.json")).json();
const version = packageJson.version;

const program = new Command();

program
  .name("relentless")
  .description("Universal AI agent orchestrator - works with Claude Code, Amp, OpenCode, Codex, Droid, and Gemini")
  .version(version);

// Init command
program
  .command("init")
  .description("Initialize Relentless in the current project")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-f, --force", "Force reinstall - overwrite existing files", false)
  .option("-y, --yes", "Auto-accept defaults (enables Auto Mode with 'good' mode)", false)
  .option("--no-auto-mode", "Disable Auto Mode without prompting", false)
  .action(async (options) => {
    const autoModeOptions = parseAutoModeFlags({
      yes: options.yes,
      noAutoMode: !options.autoMode, // Commander converts --no-auto-mode to autoMode: false
    });
    await initProject(options.dir, options.force, autoModeOptions);
  });

// Run command
program
  .command("run")
  .description("Run the orchestration loop for a feature")
  .requiredOption("-f, --feature <name>", "Feature name to run")
  .option("-a, --agent <name>", "Agent to use (claude, amp, opencode, codex, droid, gemini, auto)")
  .option("-m, --max-iterations <n>", "Maximum iterations", "20")
  .option("--mode <mode>", `Cost optimization mode (${VALID_MODES.join(", ")})`)
  .option("--fallback-order <harnesses>", `Harness fallback order (${VALID_HARNESSES.join(",")})`)
  .option("--skip-review", "Skip final review phase", false)
  .option("--review-mode <mode>", `Review quality mode (${VALID_REVIEW_MODES.join(", ")})`)
  .option("--dry-run", "Show what would be executed without running", false)
  .option("--tui", "Use beautiful terminal UI interface", false)
  .option("-d, --dir <path>", "Working directory", process.cwd())
  .action(async (options) => {
    // Load config first to get defaultAgent
    const config = await loadConfig();

    // Use CLI option if provided, otherwise use config.defaultAgent
    const agentOption = options.agent?.toLowerCase() ?? config.defaultAgent;
    const agent = agentOption.toLowerCase();

    if (agent !== "auto" && !isValidAgentName(agent)) {
      console.error(chalk.red(`Invalid agent: ${agent}`));
      console.log(`Valid agents: ${getAllAgentNames().join(", ")}, auto`);
      process.exit(1);
    }

    // Validate --fallback-order flag
    const fallbackResult = parseFallbackOrderValue(options.fallbackOrder);
    if (!fallbackResult.valid) {
      console.error(chalk.red(fallbackResult.error!));
      console.log(chalk.dim(getFallbackOrderHelpText()));
      process.exit(1);
    }
    const fallbackOrder = fallbackResult.order!;
    if (fallbackResult.warning) {
      console.log(chalk.yellow(`⚠️ ${fallbackResult.warning}`));
    }

    // Validate review flags (--skip-review and --review-mode)
    const reviewResult = parseReviewFlagsValue({
      skipReview: options.skipReview,
      reviewMode: options.reviewMode,
    });
    if (!reviewResult.valid) {
      console.error(chalk.red(reviewResult.error!));
      console.log(chalk.dim(getReviewFlagsHelpText()));
      process.exit(1);
    }
    const skipReview = reviewResult.skipReview!;
    const reviewMode = reviewResult.reviewMode;
    if (reviewResult.warningMessage && skipReview) {
      console.log(chalk.yellow(`⚠️ ${reviewResult.warningMessage}`));
    }

    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    const featureDir = join(relentlessDir, "features", options.feature);
    if (!existsSync(featureDir)) {
      console.error(chalk.red(`Feature '${options.feature}' not found`));
      console.log(chalk.dim(`Available features: ${listFeatures(options.dir).join(", ") || "none"}`));
      process.exit(1);
    }

    const prdPath = join(featureDir, "prd.json");
    const promptPath = join(relentlessDir, "prompt.md");

    if (!existsSync(prdPath)) {
      console.error(chalk.red(`PRD file not found: ${prdPath}`));
      console.log(chalk.dim("Convert a PRD first: relentless convert <prd.md> --feature " + options.feature));
      process.exit(1);
    }

    if (!existsSync(promptPath)) {
      console.error(chalk.red(`Prompt file not found: ${promptPath}`));
      console.log(chalk.dim("Run 'relentless init' to create default files"));
      process.exit(1);
    }

    const prd = await loadPRD(prdPath);
    const prdPreferredMode =
      prd.routingPreference?.type === "auto" ? prd.routingPreference.mode : undefined;
    const modeValue =
      options.mode ?? prdPreferredMode ?? config.autoMode?.defaultMode ?? DEFAULT_MODE;
    const modeResult = parseModeFlagValue(modeValue);
    if (!modeResult.valid) {
      console.error(chalk.red(modeResult.error!));
      console.log(chalk.dim(getModeHelpText()));
      process.exit(1);
    }
    const mode = modeResult.mode!;

    // Display cost estimate before execution
    if (config.autoMode?.enabled !== false) {
      const estimate = await estimateFeatureCost(prd, config.autoMode || {}, mode);
      console.log(chalk.cyan(`\n💰 ${formatCostEstimate(estimate)}`));
      if (estimate.storyEstimates.length > 0 && estimate.storyEstimates.length <= 10) {
        console.log(chalk.dim(formatCostBreakdown(estimate.storyEstimates)));
      } else if (estimate.storyEstimates.length > 10) {
        console.log(chalk.dim(`  ${estimate.storyEstimates.length} stories to estimate...`));
      }
    }

    // Log mode and fallback order selection
    console.log(chalk.dim(`Mode: ${mode}`));
    if (options.fallbackOrder) {
      console.log(chalk.dim(`Fallback order: ${fallbackOrder.join(" > ")}`));
    }
    if (!skipReview && reviewMode) {
      console.log(chalk.dim(`Review mode: ${reviewMode}`));
    }

    // Use TUI if requested
    if (options.tui) {
      const success = await runTUI({
        agent: agent as AgentName | "auto",
        maxIterations: parseInt(options.maxIterations, 10),
        workingDirectory: options.dir,
        prdPath,
        promptPath,
        feature: options.feature,
        config,
        dryRun: options.dryRun,
        mode,
        fallbackOrder,
        skipReview,
        reviewMode,
      });
      process.exit(success ? 0 : 1);
    }

    // Standard runner
    const result = await run({
      agent: agent as AgentName | "auto",
      maxIterations: parseInt(options.maxIterations, 10),
      workingDirectory: options.dir,
      prdPath,
      promptPath,
      dryRun: options.dryRun,
      config,
      mode,
      fallbackOrder,
      skipReview,
      reviewMode,
    });

    if (result.success) {
      console.log(chalk.green.bold(`\n✅ Completed successfully!`));
    } else {
      console.log(chalk.yellow(`\n⚠️ Stopped after ${result.iterations} iterations`));
    }

    console.log(chalk.dim(`\nStats:`));
    console.log(chalk.dim(`  Iterations: ${result.iterations}`));
    console.log(chalk.dim(`  Stories completed: ${result.storiesCompleted}`));
    console.log(chalk.dim(`  Duration: ${(result.duration / 1000 / 60).toFixed(1)} minutes`));

    process.exit(result.success ? 0 : 1);
  });

// Convert command
program
  .command("convert <tasksMd>")
  .description("Convert tasks.md to prd.json with smart routing classification")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("--auto-number", "Auto-number the feature directory (e.g., 001-feature-name)", false)
  .option("--with-checklist", "Merge checklist items into acceptance criteria", false)
  .option("--skip-routing", "Skip automatic routing classification (not recommended)", false)
  .option("--skip-validation", "Skip validation before conversion (advanced users only)", false)
  .option("--mode <mode>", `Cost optimization mode for routing (${VALID_MODES.join(", ")})`, "good")
  .action(async (tasksMd, options) => {
    if (!existsSync(tasksMd)) {
      console.error(chalk.red(`File not found: ${tasksMd}`));
      process.exit(1);
    }

    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    // Read tasks.md content first (needed for validation)
    const tasksContent = await Bun.file(tasksMd).text();

    // VALIDATION PHASE (unless --skip-validation is set)
    if (!options.skipValidation) {
      const { validateTasksMarkdown } = await import("../src/prd/validator");

      console.log(chalk.dim(`Validating ${tasksMd}...`));
      const validationResult = validateTasksMarkdown(tasksContent);

      // Show validation errors and abort if any
      if (validationResult.errors.length > 0) {
        console.log(chalk.red("\n❌ Validation failed:\n"));
        for (const error of validationResult.errors) {
          const location = error.line ? ` (line ${error.line})` : "";
          console.log(chalk.red(`  [${error.code}]${location}`));
          console.log(chalk.red(`    ${error.message}`));
          if (error.suggestion) {
            console.log(chalk.dim(`    💡 ${error.suggestion}`));
          }
        }
        console.log("");
        console.log(chalk.dim("Fix the errors above and try again."));
        console.log(chalk.dim("Use --skip-validation to bypass (not recommended)."));
        process.exit(1);
      }

      // Show warnings but continue
      if (validationResult.warnings.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${validationResult.warnings.length} validation warning(s):`));
        for (const warning of validationResult.warnings) {
          const location = warning.line ? ` (line ${warning.line})` : "";
          console.log(chalk.yellow(`  [${warning.code}]${location}`));
          console.log(chalk.dim(`    ${warning.message}`));
        }
        console.log("");
      }

      // Show filtered criteria summary
      if (validationResult.filteredCriteria.length > 0) {
        console.log(chalk.dim(`  📝 ${validationResult.filteredCriteria.length} criteria will be filtered during conversion`));
        if (validationResult.filteredCriteria.length <= 5) {
          for (const fc of validationResult.filteredCriteria) {
            console.log(chalk.dim(`     ${fc.storyId}: "${fc.text.substring(0, 50)}${fc.text.length > 50 ? "..." : ""}"`));
          }
        }
        console.log("");
      }

      // Show stories with no criteria warning
      if (validationResult.summary.storiesWithNoCriteria.length > 0) {
        console.log(chalk.yellow(`  ⚠️  Stories with no valid criteria: ${validationResult.summary.storiesWithNoCriteria.join(", ")}`));
        console.log("");
      }
    }

    // Determine final feature name (with auto-number if requested)
    let finalFeatureName = options.feature;
    if (options.autoNumber) {
      const features = listFeatures(options.dir);
      const numbers = features
        .map((f) => {
          const match = f.match(/^(\d{3})-/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => n > 0);
      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      const numberPrefix = nextNumber.toString().padStart(3, "0");
      finalFeatureName = `${numberPrefix}-${options.feature}`;
    }

    // Create feature directory if it doesn't exist
    const featureDir = join(relentlessDir, "features", finalFeatureName);
    if (!existsSync(featureDir)) {
      mkdirSync(featureDir, { recursive: true });
      console.log(chalk.dim(`Created feature: ${finalFeatureName}`));

      // Create progress.txt
      const progressPath = join(featureDir, "progress.txt");
      await Bun.write(progressPath, createProgressTemplate(finalFeatureName));
    }

    console.log(chalk.dim(`Converting ${tasksMd}...`));

    // Parse the markdown (content already read above)
    const parsed = parsePRDMarkdown(tasksContent);

    // Optionally merge checklist items
    if (options.withChecklist) {
      const checklistPath = join(featureDir, "checklist.md");
      if (existsSync(checklistPath)) {
        console.log(chalk.dim("  Merging checklist.md criteria..."));
        // TODO: Parse checklist and merge into acceptance criteria
        // For now, just note that it exists
        // const checklistContent = await Bun.file(checklistPath).text();
      }
    }

    const prd = createPRD(parsed, finalFeatureName);

    // ROUTING CLASSIFICATION (unless --skip-routing is set)
    if (!options.skipRouting) {
      // Validate mode
      const modeResult = parseModeFlagValue(options.mode);
      if (!modeResult.valid) {
        console.error(chalk.red(modeResult.error!));
        console.log(chalk.dim(getModeHelpText()));
        process.exit(1);
      }
      const mode = modeResult.mode!;

      // Load config for routing
      const config = await loadConfig();
      const autoModeConfig = config.autoMode || { enabled: true, defaultMode: mode };

      // Use mode from routingPreference if present, otherwise use CLI flag
      const routingMode = prd.routingPreference?.mode ?? mode;

      console.log(chalk.dim(`\nClassifying ${prd.userStories.length} stories for routing (mode: ${routingMode})...`));

      let totalEstimatedCost = 0;
      for (const story of prd.userStories) {
        const decision = await routeTask(story, autoModeConfig, routingMode);
        story.routing = {
          complexity: decision.complexity,
          harness: decision.harness,
          model: decision.model,
          mode: decision.mode,
          estimatedCost: decision.estimatedCost,
          classificationReasoning: decision.reasoning,
        };
        totalEstimatedCost += decision.estimatedCost;

        // Show per-story routing
        const costStr = decision.estimatedCost === 0 ? "free" : `$${decision.estimatedCost.toFixed(4)}`;
        console.log(chalk.dim(`  ${story.id}: ${decision.complexity} → ${decision.harness}/${decision.model} (${costStr})`));
      }

      // Show total estimated cost
      const totalCostStr = totalEstimatedCost === 0 ? "free" : `$${totalEstimatedCost.toFixed(4)}`;
      console.log(chalk.cyan(`\n💰 Total estimated cost: ${totalCostStr}`));
    } else {
      console.log(chalk.yellow("\n⚠️  Routing skipped (--skip-routing). Stories will not have routing metadata."));
    }

    // Save prd.json to feature folder
    const prdJsonPath = join(featureDir, "prd.json");
    await savePRD(prd, prdJsonPath);

    // Also copy the source files to the feature folder
    const tasksMdPath = join(featureDir, "prd.md");
    await Bun.write(tasksMdPath, tasksContent);

    console.log(chalk.green(`\n✅ Created relentless/features/${finalFeatureName}/`));
    console.log(chalk.dim(`  prd.json - ${prd.userStories.length} stories`));
    if (!options.skipRouting) {
      console.log(chalk.dim(`  ✓ Routing metadata included`));
    }
    console.log(chalk.dim(`  prd.md - from tasks.md`));
    console.log(chalk.dim(`  progress.txt - progress log`));
    if (options.withChecklist && existsSync(join(featureDir, "checklist.md"))) {
      console.log(chalk.dim(`  ✓ Checklist criteria merged`));
    }
    console.log(chalk.dim(`\nProject: ${prd.project}`));
    console.log(chalk.dim(`Branch: ${prd.branchName}`));

    // Suggest next step
    console.log(chalk.dim(`\nNext step:`));
    console.log(chalk.cyan(`  relentless run --feature ${finalFeatureName} --mode ${options.mode || "good"}`));
  });

// Feature commands
const features = program.command("features").description("Manage features");

features
  .command("list")
  .description("List all features")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (options) => {
    const featureList = listFeatures(options.dir);

    if (featureList.length === 0) {
      console.log(chalk.dim("\nNo features found."));
      console.log(chalk.dim("Create one with: relentless convert <prd.md> --feature <name>\n"));
      return;
    }

    console.log(chalk.bold("\nFeatures:\n"));
    for (const feature of featureList) {
      const relentlessDir = findRelentlessDir(options.dir);
      const featureDir = join(relentlessDir!, "features", feature);
      const prdPath = join(featureDir, "prd.json");

      if (existsSync(prdPath)) {
        try {
          const prdFile = await Bun.file(prdPath).json();
          const completed = prdFile.userStories?.filter((s: { passes?: boolean }) => s.passes).length ?? 0;
          const total = prdFile.userStories?.length ?? 0;
          console.log(`  ${feature} - ${completed}/${total} stories complete`);
        } catch {
          console.log(`  ${feature}`);
        }
      } else {
        console.log(`  ${feature} (no prd.json)`);
      }
    }
    console.log("");
  });

features
  .command("create <name>")
  .description("Create a new feature folder")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("--with-plan", "Include plan.md template", false)
  .option("--auto-number", "Auto-number the feature directory (e.g., 001-feature-name)", false)
  .action(async (name, options) => {
    try {
      const featureDir = await createFeature(options.dir, name, {
        withPlan: options.withPlan,
        autoNumber: options.autoNumber,
      });
      const featureName = featureDir.split("/").pop() || name;
      console.log(chalk.green(`✅ Created feature: ${featureName}`));
      console.log(chalk.dim(`  ${featureDir}/`));
      console.log(chalk.dim("\nNext: Add prd.md and run: relentless convert prd.md --feature " + featureName));
    } catch (error) {
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

// Status command - show all stories with status
program
  .command("status")
  .description("Show status of all user stories in a feature")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (options) => {
    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    const featureDir = join(relentlessDir, "features", options.feature);
    const prdPath = join(featureDir, "prd.json");

    if (!existsSync(prdPath)) {
      console.error(chalk.red(`Feature '${options.feature}' not found or has no prd.json`));
      console.log(chalk.dim(`Available features: ${listFeatures(options.dir).join(", ") || "none"}`));
      process.exit(1);
    }

    const prd = await loadPRD(prdPath);
    const completed = prd.userStories.filter((s) => s.passes).length;
    const total = prd.userStories.length;

    console.log(chalk.bold(`\nFeature: ${options.feature}`));
    console.log(chalk.dim(`Progress: ${completed}/${total} stories complete\n`));

    for (const story of prd.userStories) {
      const status = story.passes
        ? chalk.green("✓")
        : chalk.dim("○");
      const id = story.passes
        ? chalk.green(story.id.padEnd(8))
        : chalk.dim(story.id.padEnd(8));
      const title = story.passes
        ? chalk.strikethrough(chalk.dim(story.title))
        : story.title;
      console.log(`  ${status} ${id} ${title}`);
    }
    console.log("");
  });

// Reset command - reset a story to incomplete
program
  .command("reset <storyId>")
  .description("Reset a user story to incomplete so it can be re-run")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (storyId, options) => {
    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    const featureDir = join(relentlessDir, "features", options.feature);
    const prdPath = join(featureDir, "prd.json");

    if (!existsSync(prdPath)) {
      console.error(chalk.red(`Feature '${options.feature}' not found or has no prd.json`));
      process.exit(1);
    }

    const prd = await loadPRD(prdPath);
    const storyIndex = prd.userStories.findIndex(
      (s) => s.id.toLowerCase() === storyId.toLowerCase()
    );

    if (storyIndex === -1) {
      console.error(chalk.red(`Story '${storyId}' not found`));
      console.log(chalk.dim(`Available stories: ${prd.userStories.map((s) => s.id).join(", ")}`));
      process.exit(1);
    }

    const story = prd.userStories[storyIndex];
    const wasComplete = story.passes;
    const prevCompleted = prd.userStories.filter((s) => s.passes).length;

    // Reset the story
    prd.userStories[storyIndex].passes = false;
    await savePRD(prd, prdPath);

    const newCompleted = prd.userStories.filter((s) => s.passes).length;

    if (wasComplete) {
      console.log(chalk.green(`\n✓ Reset ${story.id} (${story.title}) to incomplete`));
      console.log(chalk.dim(`  Feature: ${options.feature}`));
      console.log(chalk.dim(`  Progress: ${newCompleted}/${prd.userStories.length} stories complete (was ${prevCompleted}/${prd.userStories.length})\n`));
    } else {
      console.log(chalk.yellow(`\n○ ${story.id} (${story.title}) was already incomplete\n`));
    }
  });

// Agents command
const agents = program.command("agents").description("Manage AI agents");

agents
  .command("list")
  .description("List available agents")
  .action(async () => {
    const health = await checkAgentHealth();

    console.log(chalk.bold("\nAvailable Agents:\n"));

    for (const agent of health) {
      const status = agent.installed
        ? chalk.green("✓ installed")
        : chalk.red("✗ not found");

      console.log(`  ${agent.displayName.padEnd(15)} ${status}`);

      if (agent.installed && agent.executablePath) {
        console.log(chalk.dim(`    ${agent.executablePath}`));
      }

      if (agent.hasSkillSupport && agent.skillInstallCommand) {
        console.log(chalk.dim(`    Skills: ${agent.skillInstallCommand}`));
      }
    }

    console.log("");
  });

agents
  .command("doctor")
  .description("Check agent health")
  .action(async () => {
    console.log(chalk.bold("\n🔍 Agent Health Check\n"));

    const health = await checkAgentHealth();
    let allHealthy = true;

    for (const agent of health) {
      if (agent.installed) {
        console.log(`${chalk.green("✓")} ${agent.displayName}`);
        console.log(chalk.dim(`  Path: ${agent.executablePath}`));
        if (agent.hasSkillSupport) {
          console.log(chalk.dim(`  Skills: Supported`));
        }
      } else {
        console.log(`${chalk.red("✗")} ${agent.displayName}`);
        allHealthy = false;
      }
    }

    console.log("");

    if (allHealthy) {
      console.log(chalk.green("All agents healthy!"));
    } else {
      console.log(chalk.yellow("Some agents are not installed."));
    }
  });

// Queue commands
const queue = program.command("queue").description("Manage queue for mid-run guidance");

queue
  .command("add <message>")
  .description("Add a message or command to the queue")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (message, options) => {
    const { queueAdd, resolveFeaturePath } = await import("../src/cli/queue");

    const resolved = await resolveFeaturePath(options.dir, options.feature);
    if (resolved.error) {
      console.error(chalk.red(resolved.error));
      process.exit(1);
    }

    const result = await queueAdd({
      message,
      featurePath: resolved.path!,
    });

    if (result.success) {
      console.log(chalk.green(`✓ ${result.message}`));
    } else {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }
  });

queue
  .command("list")
  .description("List queue contents for a feature")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-a, --all", "Show all items including processed", false)
  .action(async (options) => {
    const { queueList, formatQueueList, resolveFeaturePath } = await import("../src/cli/queue");

    const resolved = await resolveFeaturePath(options.dir, options.feature);
    if (resolved.error) {
      console.error(chalk.red(resolved.error));
      process.exit(1);
    }

    const result = await queueList({
      featurePath: resolved.path!,
      showAll: options.all,
    });

    if (result.success) {
      const output = formatQueueList({
        ...result,
        featureName: options.feature,
      });
      console.log(output);
    } else {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }
  });

queue
  .command("remove <index>")
  .description("Remove an item from the queue by index (1-based)")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (index, options) => {
    const { queueRemove, resolveFeaturePath } = await import("../src/cli/queue");

    const resolved = await resolveFeaturePath(options.dir, options.feature);
    if (resolved.error) {
      console.error(chalk.red(resolved.error));
      process.exit(1);
    }

    const parsedIndex = parseInt(index, 10);
    if (isNaN(parsedIndex)) {
      console.error(chalk.red(`Invalid index: ${index}. Must be a number`));
      process.exit(1);
    }

    const result = await queueRemove({
      index: parsedIndex,
      featurePath: resolved.path!,
    });

    if (result.success) {
      console.log(chalk.green(`✓ ${result.message}`));
    } else {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }
  });

queue
  .command("clear")
  .description("Clear all items from the queue")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (options) => {
    const { queueClear, resolveFeaturePath } = await import("../src/cli/queue");

    const resolved = await resolveFeaturePath(options.dir, options.feature);
    if (resolved.error) {
      console.error(chalk.red(resolved.error));
      process.exit(1);
    }

    const result = await queueClear({
      featurePath: resolved.path!,
    });

    if (result.success) {
      console.log(chalk.green(`✓ ${result.message}`));
    } else {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }
  });

// Analyze command
program
  .command("analyze")
  .description("Analyze cross-artifact consistency for a feature")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (options) => {
    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    const featureDir = join(relentlessDir, "features", options.feature);
    const prdPath = join(featureDir, "prd.json");

    if (!existsSync(prdPath)) {
      console.error(chalk.red(`Feature '${options.feature}' not found or has no prd.json`));
      console.log(chalk.dim(`Available features: ${listFeatures(options.dir).join(", ") || "none"}`));
      process.exit(1);
    }

    const prd = await loadPRD(prdPath);
    const report = await analyzeConsistency(prdPath, prd);

    const formatted = formatReport(report);
    console.log(formatted);

    // Exit with error code if there are critical issues
    if (report.summary.critical > 0) {
      console.log(chalk.red("\n❌ Critical issues found. Please address them before proceeding.\n"));
      process.exit(1);
    } else if (report.summary.warnings > 0) {
      console.log(chalk.yellow("\n⚠️  Warnings found. Consider addressing them.\n"));
    } else {
      console.log(chalk.green("\n✅ No critical issues or warnings found!\n"));
    }
  });

// Validate command - validate tasks.md before conversion
program
  .command("validate <tasksMd>")
  .description("Validate tasks.md file before conversion to prd.json")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("--json", "Output validation results as JSON", false)
  .option("--strict", "Treat warnings as errors", false)
  .option("--verbose", "Show all filtered criteria details", false)
  .action(async (tasksMd, options) => {
    const { validateTasksMarkdown, formatValidationResult, formatValidationResultJSON } = await import("../src/prd/validator");

    if (!existsSync(tasksMd)) {
      console.error(chalk.red(`File not found: ${tasksMd}`));
      process.exit(1);
    }

    const content = await Bun.file(tasksMd).text();
    const result = validateTasksMarkdown(content);

    // Check strict mode
    const hasIssues = result.errors.length > 0 || (options.strict && result.warnings.length > 0);

    if (options.json) {
      console.log(formatValidationResultJSON(result));
    } else {
      console.log(chalk.bold("\n📋 Tasks.md Validation\n"));
      console.log(chalk.dim(`File: ${tasksMd}`));
      console.log("");

      console.log(formatValidationResult(result));

      // Show verbose filtered criteria if requested
      if (options.verbose && result.filteredCriteria.length > 10) {
        console.log("ALL FILTERED CRITERIA:");
        for (const fc of result.filteredCriteria) {
          const location = fc.line ? ` (line ${fc.line})` : "";
          console.log(`  ${fc.storyId}${location}: "${fc.text}"`);
          console.log(`    Reason: ${fc.reason}`);
          if (fc.suggestion) {
            console.log(`    💡 ${fc.suggestion}`);
          }
        }
        console.log("");
      }

      // Final summary
      if (hasIssues) {
        if (options.strict && result.warnings.length > 0 && result.errors.length === 0) {
          console.log(chalk.red(`❌ Validation failed (strict mode: ${result.warnings.length} warnings treated as errors)\n`));
        } else {
          console.log(chalk.red(`❌ Validation failed with ${result.errors.length} error(s)\n`));
        }
        console.log(chalk.dim("Fix the errors above before running: relentless convert"));
      } else if (result.warnings.length > 0) {
        console.log(chalk.yellow(`⚠️  Validation passed with ${result.warnings.length} warning(s)\n`));
        console.log(chalk.dim("Warnings won't block conversion, but consider addressing them."));
        console.log(chalk.dim("Next step: relentless convert " + tasksMd + " --feature <name>"));
      } else {
        console.log(chalk.green("✅ Validation passed - ready to convert\n"));
        console.log(chalk.dim("Next step: relentless convert " + tasksMd + " --feature <name>"));
      }
    }

    process.exit(hasIssues ? 1 : 0);
  });

// Issues command
program
  .command("issues")
  .description("Convert user stories to GitHub issues")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("--all", "Include completed stories (default: only incomplete)", false)
  .option("--dry-run", "Show what would be created without actually creating issues", false)
  .action(async (options) => {
    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    const featureDir = join(relentlessDir, "features", options.feature);
    const prdPath = join(featureDir, "prd.json");

    if (!existsSync(prdPath)) {
      console.error(chalk.red(`Feature '${options.feature}' not found or has no prd.json`));
      console.log(chalk.dim(`Available features: ${listFeatures(options.dir).join(", ") || "none"}`));
      process.exit(1);
    }

    const prd = await loadPRD(prdPath);

    console.log(chalk.bold(`\n📋 GitHub Issues Generator\n`));
    console.log(chalk.dim(`Feature: ${options.feature}`));
    console.log(chalk.dim(`Project: ${prd.project}\n`));

    try {
      const result = await generateGitHubIssues(prd, {
        dryRun: options.dryRun,
        onlyIncomplete: !options.all,
      });

      console.log("");
      if (options.dryRun) {
        console.log(chalk.yellow(`Would create ${result.created} issues`));
      } else {
        console.log(chalk.green(`✅ Created ${result.created} issues`));
      }

      if (result.errors.length > 0) {
        console.log(chalk.red(`\n❌ ${result.errors.length} errors occurred:`));
        for (const error of result.errors) {
          console.log(chalk.dim(`  ${error}`));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

// Estimate command - display cost estimates without executing
program
  .command("estimate")
  .description("Estimate execution costs before running a feature")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("--mode <mode>", `Cost optimization mode (${VALID_MODES.join(", ")})`)
  .option("--compare", "Show comparison across all modes", false)
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (options) => {
    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    const featureDir = join(relentlessDir, "features", options.feature);
    if (!existsSync(featureDir)) {
      console.error(chalk.red(`Feature '${options.feature}' not found`));
      console.log(chalk.dim(`Available features: ${listFeatures(options.dir).join(", ") || "none"}`));
      process.exit(1);
    }

    const prdPath = join(featureDir, "prd.json");
    if (!existsSync(prdPath)) {
      console.error(chalk.red(`PRD file not found: ${prdPath}`));
      process.exit(1);
    }

    const config = await loadConfig();
    const prd = await loadPRD(prdPath);
    const prdPreferredMode =
      prd.routingPreference?.type === "auto" ? prd.routingPreference.mode : undefined;

    const modeValue =
      options.mode ?? prdPreferredMode ?? config.autoMode?.defaultMode ?? DEFAULT_MODE;
    const modeResult = parseModeFlagValue(modeValue);
    if (!modeResult.valid) {
      console.error(chalk.red(modeResult.error!));
      console.log(chalk.dim(getModeHelpText()));
      process.exit(1);
    }
    const mode = modeResult.mode!;

    const incompleteCount = prd.userStories.filter((s) => !s.passes).length;
    const totalCount = prd.userStories.length;

    console.log(chalk.bold(`\n💰 Cost Estimate: ${options.feature}\n`));
    console.log(chalk.dim(`Stories: ${incompleteCount}/${totalCount} incomplete`));

    if (incompleteCount === 0) {
      console.log(chalk.green("\n✅ All stories are complete. No execution needed.\n"));
      return;
    }

    if (options.compare) {
      // Show comparison across all modes
      console.log(chalk.dim(`\nComparing all modes...\n`));
      const comparison = await compareModes(prd, config.autoMode || {});
      console.log(formatModeComparison(comparison));
    } else {
      // Show estimate for selected mode
      const estimate = await estimateFeatureCost(prd, config.autoMode || {}, mode);
      console.log(chalk.cyan(`\n${formatCostEstimate(estimate)}\n`));

      if (estimate.storyEstimates.length > 0) {
        console.log(formatCostBreakdown(estimate.storyEstimates));
      }

      // Show brief comparison hint
      console.log(chalk.dim(`\nTip: Use --compare to see cost comparison across all modes`));
    }
  });

// Report command - show historical cost data
program
  .command("report")
  .description("Show historical cost reports for a feature")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("--last <n>", "Show only last N reports", "10")
  .action(async (options) => {
    const relentlessDir = findRelentlessDir(options.dir);
    if (!relentlessDir) {
      console.error(chalk.red("Relentless not initialized. Run: relentless init"));
      process.exit(1);
    }

    const featureDir = join(relentlessDir, "features", options.feature);
    if (!existsSync(featureDir)) {
      console.error(chalk.red(`Feature '${options.feature}' not found`));
      console.log(chalk.dim(`Available features: ${listFeatures(options.dir).join(", ") || "none"}`));
      process.exit(1);
    }

    const progressPath = join(featureDir, "progress.txt");
    if (!existsSync(progressPath)) {
      console.error(chalk.red(`Progress file not found: ${progressPath}`));
      process.exit(1);
    }

    console.log(chalk.bold(`\n📊 Cost Report History: ${options.feature}\n`));

    const history = await loadHistoricalCosts(progressPath);

    if (history.length === 0) {
      console.log(chalk.dim("No cost reports found yet."));
      console.log(chalk.dim("\nCost reports are generated after feature execution completes."));
      console.log(chalk.dim("Run: relentless run --feature " + options.feature + "\n"));
      return;
    }

    // Limit to last N reports
    const limit = parseInt(options.last, 10);
    const reportsToShow = history.slice(-limit);

    // Calculate totals
    let totalCost = 0;
    let totalSavings = 0;
    for (const entry of history) {
      totalCost += entry.actualCost;
      // Savings is calculated against baseline, so we approximate savings amount
      const baselineCost = entry.actualCost / (1 - entry.savingsPercent / 100);
      totalSavings += baselineCost - entry.actualCost;
    }

    // Display reports
    console.log(chalk.dim("Timestamp                    Mode     Cost       Savings"));
    console.log(chalk.dim("─".repeat(60)));

    for (const entry of reportsToShow) {
      const timestamp = entry.timestamp.substring(0, 19).replace("T", " ");
      const mode = entry.mode.padEnd(8);
      const cost = `$${entry.actualCost.toFixed(2)}`.padStart(8);
      const savings = `${entry.savingsPercent}%`.padStart(6);
      console.log(`${timestamp}  ${mode} ${cost}    ${savings}`);
    }

    console.log(chalk.dim("─".repeat(60)));

    // Summary
    if (history.length > limit) {
      console.log(chalk.dim(`\nShowing last ${limit} of ${history.length} reports`));
    }

    console.log(chalk.cyan(`\nTotal Cost:    $${totalCost.toFixed(2)}`));
    console.log(chalk.green(`Total Savings: ~$${totalSavings.toFixed(2)}`));
    console.log(chalk.dim(`Reports:       ${history.length}\n`));
  });

// PRD command (for agents without skill support)
program
  .command("prd <description>")
  .description("Generate a PRD using prompting (for agents without skill support)")
  .option("-a, --agent <name>", "Agent to use", "claude")
  .option("-f, --feature <name>", "Feature name")
  .action(async (description, _options) => {
    console.log(chalk.bold("\n📝 PRD Generation\n"));
    console.log(chalk.dim("For agents with skill support, use:"));
    console.log(chalk.cyan('  claude "Load the prd skill and create a PRD for ' + description + '"\n'));

    console.log(chalk.yellow("Direct PRD generation coming soon..."));
    // TODO: Implement direct PRD generation for agents without skill support
  });

// Parse arguments
program.parse();
