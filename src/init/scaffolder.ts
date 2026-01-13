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

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { checkAgentHealth } from "../agents/registry";
import { DEFAULT_CONFIG } from "../config/schema";

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
 * Files to create in the relentless/ directory
 */
const RELENTLESS_FILES: Record<string, () => string> = {
  "config.json": () => JSON.stringify(DEFAULT_CONFIG, null, 2),
  "prompt.md": () => PROMPT_TEMPLATE,
};

const PROMPT_TEMPLATE = `# Relentless Agent Instructions

You are an autonomous coding agent. Follow these instructions exactly.

**⚠️ This is a generic template. Personalize it for your project using:**
\`\`\`bash
/relentless.prompt
\`\`\`

---

## Your Task (Per Iteration)

1. Read \`relentless/features/<feature>/prd.json\`
2. Read \`relentless/features/<feature>/progress.txt\`
3. Check you're on the correct branch from PRD \`branchName\`
4. Pick the **highest priority** story where \`passes: false\`
5. Review existing code to understand patterns
6. Implement the story
7. Run quality checks (typecheck, lint, test)
8. If ALL checks pass, commit: \`feat: [Story ID] - [Story Title]\`
9. Update PRD: set \`passes: true\`
10. Append progress to \`progress.txt\`

---

## Quality Requirements

Before marking a story complete:
- [ ] All quality checks pass (typecheck, lint, test)
- [ ] Zero errors and zero warnings
- [ ] No debug code (console.log, debugger)
- [ ] No unused imports or variables
- [ ] Follows existing patterns

---

## Progress Report Format

APPEND to progress.txt:
\`\`\`
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- Learnings for future iterations
---
\`\`\`

---

## Stop Condition

After completing a story, check if ALL stories have \`passes: true\`.

If ALL complete:
\`\`\`
<promise>COMPLETE</promise>
\`\`\`

Otherwise, end normally (next iteration continues).
`;

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
export async function initProject(projectDir: string = process.cwd(), force: boolean = false): Promise<void> {
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

  // Create relentless files
  console.log(chalk.dim("\nCreating relentless files..."));

  for (const [filename, contentFn] of Object.entries(RELENTLESS_FILES)) {
    const path = join(relentlessDir, filename);

    if (existsSync(path) && !force) {
      console.log(`  ${chalk.yellow("⚠")} relentless/${filename} already exists, skipping`);
      continue;
    }

    await Bun.write(path, contentFn());
    const action = existsSync(path) && force ? "updated" : "created";
    console.log(`  ${chalk.green("✓")} relentless/${filename} ${force ? `(${action})` : ""}`);
  }

  // Note: constitution.md is NOT copied - it should be created by /relentless.constitution command
  // This ensures each project gets a personalized constitution

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

  if (existsSync(sourceSkillsDir)) {
    const skills = [
      "prd",
      "relentless",
      "constitution",
      "specify",
      "plan",
      "tasks",
      "checklist",
      "clarify",
      "analyze",
      "implement",
      "taskstoissues",
    ];

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

  // Copy commands to .claude/commands/ (for Claude Code)
  console.log(chalk.dim("\nInstalling commands..."));
  const commandsDir = join(projectDir, ".claude", "commands");
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
  }

  const sourceCommandsDir = join(relentlessRoot, ".claude", "commands");

  if (existsSync(sourceCommandsDir)) {
    const commands = [
      "relentless.analyze.md",
      "relentless.checklist.md",
      "relentless.clarify.md",
      "relentless.constitution.md",
      "relentless.implement.md",
      "relentless.plan.md",
      "relentless.specify.md",
      "relentless.tasks.md",
      "relentless.taskstoissues.md",
    ];

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

  // Print next steps
  console.log(chalk.bold.green("\n✅ Relentless initialized!\n"));
  console.log(chalk.dim("Structure:"));
  console.log(chalk.dim("  relentless/"));
  console.log(chalk.dim("  ├── config.json          # Configuration"));
  console.log(chalk.dim("  ├── constitution.md      # Project governance"));
  console.log(chalk.dim("  ├── prompt.md            # Base prompt template"));
  console.log(chalk.dim("  └── features/            # Feature folders"));
  console.log(chalk.dim("      └── <feature>/       # Each feature has:"));
  console.log(chalk.dim("          ├── prd.md       # PRD markdown"));
  console.log(chalk.dim("          ├── prd.json     # PRD JSON"));
  console.log(chalk.dim("          └── progress.txt # Progress log\n"));

  console.log("Next steps:");
  console.log(chalk.dim("1. Create project constitution (recommended):"));
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
    const planSourcePath = join(relentlessRoot, "templates", "plan.md");
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

  const entries = Bun.spawnSync(["ls", "-1", featuresDir]);
  const output = new TextDecoder().decode(entries.stdout);

  return output
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && s !== ".gitkeep");
}
