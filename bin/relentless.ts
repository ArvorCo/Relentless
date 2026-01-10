#!/usr/bin/env bun
/**
 * Relentless CLI
 *
 * Universal AI agent orchestrator
 */

import { Command } from "commander";
import chalk from "chalk";
import { join } from "node:path";
import { existsSync } from "node:fs";

import { checkAgentHealth, getAllAgentNames, isValidAgentName } from "../src/agents";
import { loadConfig, createDefaultConfig } from "../src/config";
import { loadPRD, savePRD, parsePRDMarkdown, createPRD } from "../src/prd";
import { run } from "../src/execution/runner";
import { initProject } from "../src/init/scaffolder";

const program = new Command();

program
  .name("relentless")
  .description("Universal AI agent orchestrator - works with Claude Code, Amp, OpenCode, Codex, Droid, and Gemini")
  .version("0.1.0");

// Init command
program
  .command("init")
  .description("Initialize Relentless in the current project")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (options) => {
    await initProject(options.dir);
  });

// Run command
program
  .command("run")
  .description("Run the orchestration loop")
  .option("-a, --agent <name>", "Agent to use (claude, amp, opencode, codex, droid, gemini, auto)", "claude")
  .option("-m, --max-iterations <n>", "Maximum iterations", "20")
  .option("-p, --prd <path>", "Path to prd.json", "prd.json")
  .option("--prompt <path>", "Path to prompt.md", "prompt.md")
  .option("--dry-run", "Show what would be executed without running", false)
  .option("-d, --dir <path>", "Working directory", process.cwd())
  .action(async (options) => {
    const agent = options.agent.toLowerCase();
    if (agent !== "auto" && !isValidAgentName(agent)) {
      console.error(chalk.red(`Invalid agent: ${agent}`));
      console.log(`Valid agents: ${getAllAgentNames().join(", ")}, auto`);
      process.exit(1);
    }

    const config = await loadConfig();
    const prdPath = join(options.dir, options.prd);
    const promptPath = join(options.dir, options.prompt);

    if (!existsSync(prdPath)) {
      console.error(chalk.red(`PRD file not found: ${prdPath}`));
      console.log(chalk.dim("Create a PRD first using the prd skill"));
      process.exit(1);
    }

    if (!existsSync(promptPath)) {
      console.error(chalk.red(`Prompt file not found: ${promptPath}`));
      console.log(chalk.dim("Run 'relentless init' to create default files"));
      process.exit(1);
    }

    const result = await run({
      agent: agent as any,
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
  .command("convert <prdMd>")
  .description("Convert PRD markdown to prd.json")
  .option("-o, --output <path>", "Output path", "prd.json")
  .action(async (prdMd, options) => {
    if (!existsSync(prdMd)) {
      console.error(chalk.red(`File not found: ${prdMd}`));
      process.exit(1);
    }

    console.log(chalk.dim(`Converting ${prdMd}...`));

    const content = await Bun.file(prdMd).text();
    const parsed = parsePRDMarkdown(content);
    const prd = createPRD(parsed);

    await savePRD(prd, options.output);

    console.log(chalk.green(`✅ Created ${options.output}`));
    console.log(chalk.dim(`  Project: ${prd.project}`));
    console.log(chalk.dim(`  Branch: ${prd.branchName}`));
    console.log(chalk.dim(`  Stories: ${prd.userStories.length}`));
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

// PRD command (for agents without skill support)
program
  .command("prd <description>")
  .description("Generate a PRD using prompting (for agents without skill support)")
  .option("-a, --agent <name>", "Agent to use", "claude")
  .option("-o, --output <path>", "Output directory", "tasks")
  .action(async (description, options) => {
    console.log(chalk.bold("\n📝 PRD Generation\n"));
    console.log(chalk.dim("For agents with skill support, use:"));
    console.log(chalk.cyan('  claude "Load the prd skill and create a PRD for ' + description + '"\n'));

    console.log(chalk.yellow("Direct PRD generation coming soon..."));
    // TODO: Implement direct PRD generation for agents without skill support
  });

// Parse arguments
program.parse();
