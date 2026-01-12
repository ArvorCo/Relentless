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
 */
const relentlessRoot = import.meta.dir.replace("/src/init", "");

/**
 * Files to create in the relentless/ directory
 */
const RELENTLESS_FILES: Record<string, () => string> = {
  "config.json": () => JSON.stringify(DEFAULT_CONFIG, null, 2),
  "prompt.md": () => PROMPT_TEMPLATE,
};

const PROMPT_TEMPLATE = `# Relentless Agent Instructions

You are an autonomous coding agent working on a software project.

## Before You Start

1. **Review the codebase** - Understand the current state, architecture, and patterns
2. **Read progress.txt** - Check the Codebase Patterns section for learnings from previous iterations
3. **Read the PRD** - Understand what needs to be done

## Your Task

1. Read the PRD at \`relentless/features/<feature>/prd.json\`
2. Read the progress log at \`relentless/features/<feature>/progress.txt\`
3. Check you're on the correct branch from PRD \`branchName\`. If not, check it out or create from main.
4. Pick the **highest priority** user story where \`passes: false\`
5. **Review relevant code** before implementing - understand existing patterns
6. Implement that single user story
7. Run quality checks (typecheck, lint, test - whatever your project requires)
8. If checks pass, commit ALL changes with message: \`feat: [Story ID] - [Story Title]\`
9. Update the PRD to set \`passes: true\` for the completed story
10. Append your progress to \`relentless/features/<feature>/progress.txt\`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
\`\`\`
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
\`\`\`

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns
- Review code before modifying it

## Stop Condition

After completing a user story, check if ALL stories have \`passes: true\`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with \`passes: false\`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Review existing code before implementing
- Commit frequently
- Keep CI green
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

      if (existsSync(sourcePath)) {
        if (existsSync(destPath) && !force) {
          console.log(`  ${chalk.yellow("⚠")} .claude/skills/${skill} already exists, skipping`);
        } else {
          if (existsSync(destPath) && force) {
            await Bun.spawn(["rm", "-rf", destPath]).exited;
          }
          await Bun.spawn(["cp", "-r", sourcePath, destPath]).exited;
          const action = force ? "updated" : "created";
          console.log(`  ${chalk.green("✓")} .claude/skills/${skill} (${action})`);
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
