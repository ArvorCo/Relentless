/**
 * Project Scaffolder
 *
 * Creates Relentless files in a project's relentless/ directory
 *
 * Structure:
 * relentless/
 * ├── config.json
 * ├── prompt.md
 * └── features/
 *     └── <feature-name>/
 *         ├── prd.md
 *         ├── prd.json
 *         └── progress.txt
 *
 * Best practices:
 * - All relentless files go in relentless/ subdirectory
 * - Each feature gets its own folder with prd.md, prd.json, progress.txt
 * - Only skills are installed to .claude/skills/ (expected by Claude Code)
 * - Does not modify project root files (CLAUDE.md, AGENTS.md, etc.)
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { checkAgentHealth } from "../agents/registry";
import { DEFAULT_CONFIG, type Mode } from "../config/schema";

/**
 * Explanation of Auto Mode shown to users during init
 */
export const AUTO_MODE_EXPLANATION = `
Smart Auto Mode automatically routes tasks to the most cost-effective model
based on complexity. Simple tasks use free/cheap models, complex tasks use
premium models. This typically saves 50-75% on API costs.
`;

/**
 * Descriptions for each cost mode
 */
export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  free: "Free tier models only (OpenCode) - Maximum savings",
  cheap: "Budget models (Haiku, Gemini Flash, GPT-5.2 low effort) - High savings, good quality",
  good: "Balanced models (Sonnet, GPT-5.2 medium effort) - Good savings, high quality (Recommended)",
  genius: "Premium models (Opus, GPT-5.2 high effort) - No savings, maximum quality",
};

/**
 * Estimated savings percentages for each mode
 */
const MODE_SAVINGS: Record<Mode, string> = {
  free: "~95%",
  cheap: "~75%",
  good: "~50%",
  genius: "~0%",
};

/**
 * Interface for Auto Mode configuration options
 */
export interface InitAutoModeOptions {
  /** Skip the interactive prompt and use provided values */
  skipPrompt?: boolean;
  /** Whether Auto Mode should be enabled */
  enabled?: boolean;
  /** Default mode to use */
  defaultMode?: Mode;
  /** Generate YAML config instead of JSON */
  generateYaml?: boolean;
}

/**
 * Interface for readline mock (for testing)
 */
interface ReadlineInterface {
  question: (prompt: string, callback: (answer: string) => void) => void;
  close: () => void;
}

/**
 * Options for promptAutoModeConfig
 */
export interface PromptAutoModeOptions {
  /** Readline interface (can be mocked for testing) */
  readline: ReadlineInterface;
  /** Default mode if user presses Enter */
  defaultMode: Mode;
}

/**
 * Result from promptAutoModeConfig
 */
export interface AutoModeConfigResult {
  enabled: boolean;
  defaultMode?: Mode;
}

/**
 * Get estimated savings percentage for a mode
 */
export function getEstimatedSavings(mode: Mode): string {
  return MODE_SAVINGS[mode];
}

/**
 * Parse Auto Mode related CLI flags
 */
export function parseAutoModeFlags(options: {
  yes?: boolean;
  noAutoMode?: boolean;
}): InitAutoModeOptions {
  // --no-auto-mode takes priority over --yes
  if (options.noAutoMode) {
    return {
      skipPrompt: true,
      enabled: false,
    };
  }

  if (options.yes) {
    return {
      skipPrompt: true,
      enabled: true,
      defaultMode: "good",
    };
  }

  return {
    skipPrompt: false,
  };
}

/**
 * Check if project already has Auto Mode config
 */
export async function hasExistingAutoModeConfig(projectDir: string): Promise<boolean> {
  const relentlessDir = join(projectDir, "relentless");

  // Check config.json
  const configJsonPath = join(relentlessDir, "config.json");
  if (existsSync(configJsonPath)) {
    try {
      const content = await Bun.file(configJsonPath).text();
      const config = JSON.parse(content);
      if (config.autoMode !== undefined) {
        return true;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check relentless.config.yaml
  const yamlPath = join(relentlessDir, "relentless.config.yaml");
  if (existsSync(yamlPath)) {
    try {
      const content = await Bun.file(yamlPath).text();
      if (content.includes("autoMode:")) {
        return true;
      }
    } catch {
      // Ignore read errors
    }
  }

  return false;
}

/**
 * Prompt user for Auto Mode configuration
 */
export async function promptAutoModeConfig(
  options: PromptAutoModeOptions
): Promise<AutoModeConfigResult> {
  const { readline, defaultMode } = options;

  return new Promise((resolve) => {
    // First question: Enable Auto Mode?
    readline.question(
      chalk.yellow("Enable Smart Auto Mode? (Saves 50-75% on costs) [Y/n]: "),
      (enableAnswer) => {
        const normalizedAnswer = enableAnswer.trim().toLowerCase();

        // Empty or affirmative answers enable Auto Mode
        if (
          normalizedAnswer === "" ||
          normalizedAnswer === "y" ||
          normalizedAnswer === "yes"
        ) {
          // Second question: Select mode
          readline.question(
            chalk.yellow(`Default mode? [free/cheap/good/genius] (${defaultMode}): `),
            (modeAnswer) => {
              const trimmedMode = modeAnswer.trim().toLowerCase();
              let selectedMode: Mode = defaultMode;

              if (trimmedMode === "") {
                selectedMode = defaultMode;
              } else if (["free", "cheap", "good", "genius"].includes(trimmedMode)) {
                selectedMode = trimmedMode as Mode;
              } else {
                // Invalid mode - use default
                selectedMode = defaultMode;
              }

              resolve({
                enabled: true,
                defaultMode: selectedMode,
              });
            }
          );
        } else {
          // User declined
          resolve({
            enabled: false,
          });
        }
      }
    );
  });
}

/**
 * Generate YAML config content for Auto Mode
 */
export function generateAutoModeYamlConfig(config: AutoModeConfigResult): string {
  const lines: string[] = [];

  lines.push("# Relentless Auto Mode Configuration");
  lines.push("# Generated by relentless init");
  lines.push("");
  lines.push("autoMode:");
  lines.push(`  enabled: ${config.enabled}`);

  if (config.enabled && config.defaultMode) {
    lines.push(`  defaultMode: ${config.defaultMode}`);
    lines.push("");
    lines.push("  # Harness fallback order (uncomment to customize)");
    lines.push("  # fallbackOrder:");
    lines.push("  #   - claude");
    lines.push("  #   - amp");
    lines.push("  #   - opencode");
    lines.push("  #   - codex");
    lines.push("  #   - gemini");
    lines.push("  #   - droid");
    lines.push("");
    lines.push("  # Custom model mappings by complexity (uncomment to customize)");
    lines.push("  # modeModels:");
    lines.push("  #   simple: haiku-4.5");
    lines.push("  #   medium: sonnet-4.5");
    lines.push("  #   complex: opus-4.5");
    lines.push("  #   expert: opus-4.5");
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Get the relentless root directory
 * Works for both:
 * - Development: /path/to/relentless/src/init -> /path/to/relentless
 * - Global install: /usr/local/lib/node_modules/@arvorco/relentless/src/init -> /usr/local/lib/node_modules/@arvorco/relentless
 */
function getRelentlessRoot(): string {
  // import.meta.dir is the directory of this file (src/init/)
  const currentDir = import.meta.dir;
  
  // Remove /src/init from the end
  if (currentDir.endsWith("/src/init")) {
    return currentDir.replace("/src/init", "");
  }
  
  // Fallback: go up two directories
  return join(currentDir, "..", "..");
}

const relentlessRoot = getRelentlessRoot();

/**
 * Default progress.txt content for a new feature with YAML frontmatter
 */
export function createProgressTemplate(featureName: string): string {
  const started = new Date().toISOString();
  return `---
feature: ${featureName}
started: ${started}
last_updated: ${started}
stories_completed: 0
patterns: []
---

# Progress Log: ${featureName}

## Codebase Patterns

<!-- Patterns discovered during development will be added here -->

---
`;
}

/**
 * Initialize Relentless in a project
 */
export async function initProject(
  projectDir: string = process.cwd(),
  force: boolean = false,
  autoModeOptions: InitAutoModeOptions = {}
): Promise<void> {
  console.log(chalk.bold.blue(`\n🚀 ${force ? "Reinstalling" : "Initializing"} Relentless\n`));

  // Check installed agents
  console.log(chalk.dim("Detecting installed agents..."));
  const health = await checkAgentHealth();
  const installed = health.filter((h) => h.installed);

  console.log(`\nFound ${chalk.green(installed.length)} installed agents:`);
  for (const agent of installed) {
    console.log(`  ${chalk.green("✓")} ${agent.displayName}`);
  }

  const notInstalled = health.filter((h) => !h.installed);
  if (notInstalled.length > 0) {
    console.log(chalk.dim(`\nNot installed: ${notInstalled.map((a) => a.displayName).join(", ")}`));
  }

  // Create relentless directory structure
  const relentlessDir = join(projectDir, "relentless");
  const featuresDir = join(relentlessDir, "features");

  for (const dir of [relentlessDir, featuresDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Create relentless files (can be force-updated)
  console.log(chalk.dim("\nCreating relentless files..."));

  // Generate config with Auto Mode settings if provided
  const configPath = join(relentlessDir, "config.json");
  const existingAutoMode = await hasExistingAutoModeConfig(projectDir);

  if (existsSync(configPath) && !force) {
    console.log(`  ${chalk.yellow("⚠")} relentless/config.json already exists, skipping`);
  } else {
    // Build config with Auto Mode settings
    const config = { ...DEFAULT_CONFIG };

    // Apply Auto Mode options if provided
    if (autoModeOptions.skipPrompt) {
      config.autoMode = {
        ...config.autoMode,
        enabled: autoModeOptions.enabled ?? false,
      };
      if (autoModeOptions.enabled && autoModeOptions.defaultMode) {
        config.autoMode.defaultMode = autoModeOptions.defaultMode;
      }
    } else if (!existingAutoMode) {
      // Set default autoMode if no existing config
      config.autoMode = {
        ...config.autoMode,
        enabled: autoModeOptions.enabled ?? false,
      };
      if (autoModeOptions.enabled && autoModeOptions.defaultMode) {
        config.autoMode.defaultMode = autoModeOptions.defaultMode;
      }
    }

    await Bun.write(configPath, JSON.stringify(config, null, 2));
    const action = force ? "updated" : "created";
    console.log(`  ${chalk.green("✓")} relentless/config.json (${action})`);
  }

  // Generate YAML config if requested
  if (autoModeOptions.generateYaml && autoModeOptions.enabled !== undefined) {
    const yamlPath = join(relentlessDir, "relentless.config.yaml");
    const yamlContent = generateAutoModeYamlConfig({
      enabled: autoModeOptions.enabled,
      defaultMode: autoModeOptions.defaultMode,
    });
    await Bun.write(yamlPath, yamlContent);
    console.log(`  ${chalk.green("✓")} relentless/relentless.config.yaml (created)`);
  }

  // Note: constitution.md and prompt.md are NOT created here
  // They should be generated by /relentless.constitution command
  // This ensures each project gets personalized governance and agent instructions

  // Create features directory with .gitkeep
  const gitkeepPath = join(featuresDir, ".gitkeep");
  if (!existsSync(gitkeepPath)) {
    await Bun.write(gitkeepPath, "");
    console.log(`  ${chalk.green("✓")} relentless/features/.gitkeep`);
  }

  // Copy skills to .claude/skills/ (this is expected by Claude Code)
  console.log(chalk.dim("\nInstalling skills..."));
  const skillsDir = join(projectDir, ".claude", "skills");
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true });
  }

  const sourceSkillsDir = join(relentlessRoot, ".claude", "skills");

  // Check if we're running in the relentless project itself (source == destination)
  // This prevents accidentally deleting our own source files with -f flag
  const isRelentlessProject = skillsDir === sourceSkillsDir;
  if (isRelentlessProject) {
    console.log(chalk.yellow("  ⚠ Running in Relentless project itself - skipping skill copy to avoid self-destruction"));
  }

  if (!existsSync(sourceSkillsDir)) {
    console.error(chalk.red(`\n❌ Error: Skills directory not found at ${sourceSkillsDir}`));
    console.error(chalk.red(`   Relentless root: ${relentlessRoot}`));
    console.error(chalk.red(`   This may indicate an installation problem.`));
    console.error(chalk.dim(`\n   If you installed globally, the package may be at:`));
    console.error(chalk.dim(`   - /usr/local/lib/node_modules/@arvorco/relentless`));
    console.error(chalk.dim(`   - ~/.bun/install/global/node_modules/@arvorco/relentless`));
    console.error(chalk.dim(`\n   Try reinstalling: npm install -g @arvorco/relentless\n`));
    process.exit(1);
  }

  // List of skills to install (used for both Claude Code and Amp)
  const skills = [
    "prd",
    "relentless",
    "constitution",
    "specify",
    "plan",
    "tasks",
    "convert",
    "checklist",
    "clarify",
    "analyze",
    "implement",
    "taskstoissues",
  ];

  if (existsSync(sourceSkillsDir) && !isRelentlessProject) {
    for (const skill of skills) {
      const sourcePath = join(sourceSkillsDir, skill);
      const destPath = join(skillsDir, skill);

      if (!existsSync(sourcePath)) {
        console.log(`  ${chalk.red("✗")} .claude/skills/${skill} - source not found`);
        continue;
      }

      if (existsSync(destPath) && !force) {
        console.log(`  ${chalk.yellow("⚠")} .claude/skills/${skill} already exists, skipping`);
      } else {
        try {
          if (existsSync(destPath) && force) {
            await Bun.spawn(["rm", "-rf", destPath]).exited;
          }
          const result = await Bun.spawn(["cp", "-r", sourcePath, destPath]).exited;
          if (result !== 0) {
            console.log(`  ${chalk.red("✗")} .claude/skills/${skill} - copy failed`);
            continue;
          }
          const action = force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .claude/skills/${skill} (${action})`);
        } catch (error) {
          console.log(`  ${chalk.red("✗")} .claude/skills/${skill} - error: ${error}`);
        }
      }
    }
  }

  // Copy skills to .amp/skills/ if Amp is installed
  const ampInstalled = installed.some((a) => a.name === "amp");
  if (ampInstalled) {
    console.log(chalk.dim("\nInstalling skills for Amp..."));
    const ampSkillsDir = join(projectDir, ".amp", "skills");
    if (!existsSync(ampSkillsDir)) {
      mkdirSync(ampSkillsDir, { recursive: true });
    }

    for (const skill of skills) {
      const sourcePath = join(sourceSkillsDir, skill);
      const destPath = join(ampSkillsDir, skill);

      if (!existsSync(sourcePath)) {
        continue;
      }

      if (existsSync(destPath) && !force) {
        console.log(`  ${chalk.yellow("⚠")} .amp/skills/${skill} already exists, skipping`);
      } else {
        try {
          if (existsSync(destPath) && force) {
            await Bun.spawn(["rm", "-rf", destPath]).exited;
          }
          const result = await Bun.spawn(["cp", "-r", sourcePath, destPath]).exited;
          if (result !== 0) {
            console.log(`  ${chalk.red("✗")} .amp/skills/${skill} - copy failed`);
            continue;
          }
          const action = force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .amp/skills/${skill} (${action})`);
        } catch (error) {
          console.log(`  ${chalk.red("✗")} .amp/skills/${skill} - error: ${error}`);
        }
      }
    }
  }

  // Copy skills to .opencode/skill/ if OpenCode is installed (SINGULAR!)
  const opencodeInstalled = installed.some((a) => a.name === "opencode");
  if (opencodeInstalled) {
    console.log(chalk.dim("\nInstalling skills for OpenCode..."));
    const opencodeSkillsDir = join(projectDir, ".opencode", "skill");
    if (!existsSync(opencodeSkillsDir)) {
      mkdirSync(opencodeSkillsDir, { recursive: true });
    }

    for (const skill of skills) {
      const sourcePath = join(sourceSkillsDir, skill);
      const destPath = join(opencodeSkillsDir, skill);

      if (!existsSync(sourcePath)) {
        continue;
      }

      if (existsSync(destPath) && !force) {
        console.log(`  ${chalk.yellow("⚠")} .opencode/skill/${skill} already exists, skipping`);
      } else {
        try {
          if (existsSync(destPath) && force) {
            await Bun.spawn(["rm", "-rf", destPath]).exited;
          }
          const result = await Bun.spawn(["cp", "-r", sourcePath, destPath]).exited;
          if (result !== 0) {
            console.log(`  ${chalk.red("✗")} .opencode/skill/${skill} - copy failed`);
            continue;
          }
          const action = force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .opencode/skill/${skill} (${action})`);
        } catch (error) {
          console.log(`  ${chalk.red("✗")} .opencode/skill/${skill} - error: ${error}`);
        }
      }
    }
  }

  // Copy skills to .codex/skills/ if Codex is installed
  const codexInstalled = installed.some((a) => a.name === "codex");
  if (codexInstalled) {
    console.log(chalk.dim("\nInstalling skills for Codex..."));
    const codexSkillsDir = join(projectDir, ".codex", "skills");
    if (!existsSync(codexSkillsDir)) {
      mkdirSync(codexSkillsDir, { recursive: true });
    }

    for (const skill of skills) {
      const sourcePath = join(sourceSkillsDir, skill);
      const destPath = join(codexSkillsDir, skill);

      if (!existsSync(sourcePath)) {
        continue;
      }

      if (existsSync(destPath) && !force) {
        console.log(`  ${chalk.yellow("⚠")} .codex/skills/${skill} already exists, skipping`);
      } else {
        try {
          if (existsSync(destPath) && force) {
            await Bun.spawn(["rm", "-rf", destPath]).exited;
          }
          const result = await Bun.spawn(["cp", "-r", sourcePath, destPath]).exited;
          if (result !== 0) {
            console.log(`  ${chalk.red("✗")} .codex/skills/${skill} - copy failed`);
            continue;
          }
          const action = force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .codex/skills/${skill} (${action})`);
        } catch (error) {
          console.log(`  ${chalk.red("✗")} .codex/skills/${skill} - error: ${error}`);
        }
      }
    }
  }

  // Copy skills to .factory/skills/ if Droid (Factory) is installed
  const droidInstalled = installed.some((a) => a.name === "droid");
  if (droidInstalled) {
    console.log(chalk.dim("\nInstalling skills for Droid (Factory)..."));
    const factorySkillsDir = join(projectDir, ".factory", "skills");
    if (!existsSync(factorySkillsDir)) {
      mkdirSync(factorySkillsDir, { recursive: true });
    }

    for (const skill of skills) {
      const sourcePath = join(sourceSkillsDir, skill);
      const destPath = join(factorySkillsDir, skill);

      if (!existsSync(sourcePath)) {
        continue;
      }

      if (existsSync(destPath) && !force) {
        console.log(`  ${chalk.yellow("⚠")} .factory/skills/${skill} already exists, skipping`);
      } else {
        try {
          if (existsSync(destPath) && force) {
            await Bun.spawn(["rm", "-rf", destPath]).exited;
          }
          const result = await Bun.spawn(["cp", "-r", sourcePath, destPath]).exited;
          if (result !== 0) {
            console.log(`  ${chalk.red("✗")} .factory/skills/${skill} - copy failed`);
            continue;
          }
          const action = force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .factory/skills/${skill} (${action})`);
        } catch (error) {
          console.log(`  ${chalk.red("✗")} .factory/skills/${skill} - error: ${error}`);
        }
      }
    }
  }

  // Copy commands to .claude/commands/ (for Claude Code)
  console.log(chalk.dim("\nInstalling commands..."));
  const commandsDir = join(projectDir, ".claude", "commands");
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
  }

  const sourceCommandsDir = join(relentlessRoot, ".claude", "commands");

  // Check if we're running in the relentless project itself (source == destination)
  const isRelentlessProjectCommands = commandsDir === sourceCommandsDir;
  if (isRelentlessProjectCommands) {
    console.log(chalk.yellow("  ⚠ Running in Relentless project itself - skipping command copy to avoid self-destruction"));
  }

  // List of commands to install (used for Claude, OpenCode, Factory, and Codex)
  const commands = [
    "relentless.analyze.md",
    "relentless.checklist.md",
    "relentless.clarify.md",
    "relentless.constitution.md",
    "relentless.convert.md",
    "relentless.implement.md",
    "relentless.plan.md",
    "relentless.specify.md",
    "relentless.tasks.md",
    "relentless.taskstoissues.md",
  ];

  if (existsSync(sourceCommandsDir) && !isRelentlessProjectCommands) {
    for (const command of commands) {
      const sourcePath = join(sourceCommandsDir, command);
      const destPath = join(commandsDir, command);

      if (existsSync(sourcePath)) {
        if (existsSync(destPath) && !force) {
          console.log(`  ${chalk.yellow("⚠")} .claude/commands/${command} already exists, skipping`);
        } else {
          const content = await Bun.file(sourcePath).text();
          await Bun.write(destPath, content);
          const action = existsSync(destPath) && force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .claude/commands/${command} (${action})`);
        }
      }
    }
  }

  // Copy commands to .opencode/command/ if OpenCode is installed (SINGULAR!)
  if (opencodeInstalled && existsSync(sourceCommandsDir)) {
    console.log(chalk.dim("\nInstalling commands for OpenCode..."));
    const opencodeCommandsDir = join(projectDir, ".opencode", "command");
    if (!existsSync(opencodeCommandsDir)) {
      mkdirSync(opencodeCommandsDir, { recursive: true });
    }

    for (const command of commands) {
      const sourcePath = join(sourceCommandsDir, command);
      const destPath = join(opencodeCommandsDir, command);

      if (existsSync(sourcePath)) {
        if (existsSync(destPath) && !force) {
          console.log(`  ${chalk.yellow("⚠")} .opencode/command/${command} already exists, skipping`);
        } else {
          const content = await Bun.file(sourcePath).text();
          await Bun.write(destPath, content);
          const action = existsSync(destPath) && force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .opencode/command/${command} (${action})`);
        }
      }
    }
  }

  // Copy commands to .factory/commands/ if Droid (Factory) is installed
  if (droidInstalled && existsSync(sourceCommandsDir)) {
    console.log(chalk.dim("\nInstalling commands for Droid (Factory)..."));
    const factoryCommandsDir = join(projectDir, ".factory", "commands");
    if (!existsSync(factoryCommandsDir)) {
      mkdirSync(factoryCommandsDir, { recursive: true });
    }

    for (const command of commands) {
      const sourcePath = join(sourceCommandsDir, command);
      const destPath = join(factoryCommandsDir, command);

      if (existsSync(sourcePath)) {
        if (existsSync(destPath) && !force) {
          console.log(`  ${chalk.yellow("⚠")} .factory/commands/${command} already exists, skipping`);
        } else {
          const content = await Bun.file(sourcePath).text();
          await Bun.write(destPath, content);
          const action = existsSync(destPath) && force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .factory/commands/${command} (${action})`);
        }
      }
    }
  }

  // Copy prompts to ~/.codex/prompts/ if Codex is installed (user-level only)
  if (codexInstalled && existsSync(sourceCommandsDir)) {
    console.log(chalk.dim("\nInstalling prompts for Codex (user-level)..."));
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const codexPromptsDir = join(homeDir, ".codex", "prompts");
    if (!existsSync(codexPromptsDir)) {
      mkdirSync(codexPromptsDir, { recursive: true });
    }

    for (const command of commands) {
      const sourcePath = join(sourceCommandsDir, command);
      // Codex prompts are invoked as /prompts:name, so we keep the same filename
      const destPath = join(codexPromptsDir, command);

      if (existsSync(sourcePath)) {
        if (existsSync(destPath) && !force) {
          console.log(`  ${chalk.yellow("⚠")} ~/.codex/prompts/${command} already exists, skipping`);
        } else {
          const content = await Bun.file(sourcePath).text();
          await Bun.write(destPath, content);
          const action = existsSync(destPath) && force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} ~/.codex/prompts/${command} (${action})`);
        }
      }
    }
  }

  // Create .gemini/GEMINI.md context file if Gemini is installed
  const geminiInstalled = installed.some((a) => a.name === "gemini");
  if (geminiInstalled) {
    console.log(chalk.dim("\nInstalling context for Gemini..."));
    const geminiDir = join(projectDir, ".gemini");
    if (!existsSync(geminiDir)) {
      mkdirSync(geminiDir, { recursive: true });
    }

    const geminiContextPath = join(geminiDir, "GEMINI.md");
    const geminiContextContent = `# Relentless - Universal AI Agent Orchestrator

This project uses Relentless for feature-driven development with AI agents.

## Available Skills

The following skills are available in \`.claude/skills/\`:

- **prd** - Generate Product Requirements Documents
- **constitution** - Create project governance and coding principles
- **specify** - Create feature specifications
- **plan** - Generate technical implementation plans
- **tasks** - Generate user stories and tasks
- **checklist** - Generate quality validation checklists
- **clarify** - Resolve ambiguities in specifications
- **analyze** - Analyze consistency across artifacts
- **implement** - Execute implementation workflows
- **taskstoissues** - Convert user stories to GitHub issues

## Workflow

1. Run \`/relentless.constitution\` to create project governance
2. Run \`/relentless.specify "feature description"\` to create a feature spec
3. Run \`/relentless.plan\` to generate technical plan
4. Run \`/relentless.tasks\` to generate user stories
5. Run \`/relentless.checklist\` to generate quality checklist

## Feature Directory Structure

\`\`\`
relentless/features/<feature-name>/
├── spec.md       # Feature specification
├── plan.md       # Technical plan
├── tasks.md      # User stories
├── checklist.md  # Quality checklist
├── prd.json      # PRD JSON (for orchestrator)
└── progress.txt  # Progress log
\`\`\`

For full documentation, see: https://github.com/ArvorCo/Relentless
`;

    if (existsSync(geminiContextPath) && !force) {
      console.log(`  ${chalk.yellow("⚠")} .gemini/GEMINI.md already exists, skipping`);
    } else {
      await Bun.write(geminiContextPath, geminiContextContent);
      const action = existsSync(geminiContextPath) && force ? "updated" : "created";
      console.log(`  ${chalk.green("✓")} .gemini/GEMINI.md (${action})`);
    }
  }

  // Print next steps
  console.log(chalk.bold.green("\n✅ Relentless initialized!\n"));
  console.log(chalk.dim("Structure:"));
  console.log(chalk.dim("  relentless/"));
  console.log(chalk.dim("  ├── config.json          # Configuration"));
  console.log(chalk.dim("  ├── constitution.md      # Project governance (run /relentless.constitution)"));
  console.log(chalk.dim("  ├── prompt.md            # Agent instructions (run /relentless.constitution)"));
  console.log(chalk.dim("  └── features/            # Feature folders"));
  console.log(chalk.dim("      └── <feature>/       # Each feature has:"));
  console.log(chalk.dim("          ├── spec.md      # Feature specification"));
  console.log(chalk.dim("          ├── plan.md      # Technical plan"));
  console.log(chalk.dim("          ├── tasks.md     # User stories"));
  console.log(chalk.dim("          ├── checklist.md # Quality checklist"));
  console.log(chalk.dim("          ├── prd.json     # PRD JSON (for orchestrator)"));
  console.log(chalk.dim("          └── progress.txt # Progress log\n"));

  console.log("Next steps:");
  console.log(chalk.dim("1. Create project constitution and prompt (required):"));
  console.log(`   ${chalk.cyan("/relentless.constitution")}`);
  console.log(chalk.dim("\n2. Create a feature specification:"));
  console.log(`   ${chalk.cyan("/relentless.specify Add user authentication")}`);
  console.log(chalk.dim("\n3. Generate plan, tasks, and checklist:"));
  console.log(`   ${chalk.cyan("/relentless.plan")}`);
  console.log(`   ${chalk.cyan("/relentless.tasks")}`);
  console.log(`   ${chalk.cyan("/relentless.checklist")}`);
  console.log(chalk.dim("\n4. Convert to JSON and run:"));
  console.log(`   ${chalk.cyan("relentless convert relentless/features/NNN-feature/tasks.md --feature NNN-feature")}`);
  console.log(`   ${chalk.cyan("relentless run --feature NNN-feature --tui")}`);
  console.log(chalk.dim("\nUpgrade note:"));
  console.log(chalk.dim("If you are upgrading Relentless, re-run /relentless.constitution to refresh prompt.md with the latest instructions."));
  console.log("");
}

/**
 * Options for creating a feature
 */
export interface CreateFeatureOptions {
  /** Include plan.md template */
  withPlan?: boolean;
  /** Auto-number the feature directory (e.g., 001-feature-name) */
  autoNumber?: boolean;
}

/**
 * Get the next feature number by finding the highest existing number
 */
function getNextFeatureNumber(projectDir: string): number {
  const featuresDir = join(projectDir, "relentless", "features");

  if (!existsSync(featuresDir)) {
    return 1;
  }

  const features = listFeatures(projectDir);

  // Extract numbers from features with format NNN-name
  const numbers = features
    .map((feature) => {
      const match = feature.match(/^(\d{3})-/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  // Return next number (or 1 if no numbered features exist)
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

/**
 * Create a new feature folder
 */
export async function createFeature(
  projectDir: string,
  featureName: string,
  options: CreateFeatureOptions = {}
): Promise<string> {
  // Generate numbered directory name if autoNumber is enabled
  let finalFeatureName = featureName;
  if (options.autoNumber) {
    const nextNumber = getNextFeatureNumber(projectDir);
    const numberPrefix = nextNumber.toString().padStart(3, "0");
    finalFeatureName = `${numberPrefix}-${featureName}`;
  }

  const featureDir = join(projectDir, "relentless", "features", finalFeatureName);

  if (existsSync(featureDir)) {
    throw new Error(`Feature '${finalFeatureName}' already exists`);
  }

  mkdirSync(featureDir, { recursive: true });

  // Create progress.txt
  const progressPath = join(featureDir, "progress.txt");
  await Bun.write(progressPath, createProgressTemplate(finalFeatureName));

  // Copy plan.md template if requested
  if (options.withPlan) {
    const planSourcePath = join(relentlessRoot, ".claude", "skills", "plan", "templates", "plan.md");
    const planDestPath = join(featureDir, "plan.md");

    if (existsSync(planSourcePath)) {
      const planContent = await Bun.file(planSourcePath).text();
      await Bun.write(planDestPath, planContent);
    }
  }

  return featureDir;
}

/**
 * List all features
 */
export function listFeatures(projectDir: string): string[] {
  const featuresDir = join(projectDir, "relentless", "features");

  if (!existsSync(featuresDir)) {
    return [];
  }

  return readdirSync(featuresDir)
    .map((s) => s.trim())
    .filter((s) => s && s !== ".gitkeep");
}
