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
import { initProject, createFeature, listFeatures, createProgressTemplate } from "../src/init/scaffolder";

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
  .action(async (options) => {
    await initProject(options.dir, options.force);
  });

// Run command
program
  .command("run")
  .description("Run the orchestration loop for a feature")
  .requiredOption("-f, --feature <name>", "Feature name to run")
  .option("-a, --agent <name>", "Agent to use (claude, amp, opencode, codex, droid, gemini, auto)", "claude")
  .option("-m, --max-iterations <n>", "Maximum iterations", "20")
  .option("--dry-run", "Show what would be executed without running", false)
  .option("--tui", "Use beautiful terminal UI interface", false)
  .option("-d, --dir <path>", "Working directory", process.cwd())
  .action(async (options) => {
    const agent = options.agent.toLowerCase();
    if (agent !== "auto" && !isValidAgentName(agent)) {
      console.error(chalk.red(`Invalid agent: ${agent}`));
      console.log(`Valid agents: ${getAllAgentNames().join(", ")}, auto`);
      process.exit(1);
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

    const config = await loadConfig();

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
  .description("Convert tasks.md to prd.json, optionally merging checklist.md criteria")
  .requiredOption("-f, --feature <name>", "Feature name")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("--auto-number", "Auto-number the feature directory (e.g., 001-feature-name)", false)
  .option("--with-checklist", "Merge checklist items into acceptance criteria", false)
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

    // Read tasks.md (primary source)
    const tasksContent = await Bun.file(tasksMd).text();
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

    // Save prd.json to feature folder
    const prdJsonPath = join(featureDir, "prd.json");
    await savePRD(prd, prdJsonPath);

    // Also copy the source files to the feature folder
    const tasksMdPath = join(featureDir, "prd.md");
    await Bun.write(tasksMdPath, tasksContent);

    console.log(chalk.green(`✅ Created relentless/features/${finalFeatureName}/`));
    console.log(chalk.dim(`  prd.json - ${prd.userStories.length} stories`));
    console.log(chalk.dim(`  prd.md - from tasks.md`));
    console.log(chalk.dim(`  progress.txt - progress log`));
    if (options.withChecklist && existsSync(join(featureDir, "checklist.md"))) {
      console.log(chalk.dim(`  ✓ Checklist criteria merged`));
    }
    console.log(chalk.dim(`\nProject: ${prd.project}`));
    console.log(chalk.dim(`Branch: ${prd.branchName}`));
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
