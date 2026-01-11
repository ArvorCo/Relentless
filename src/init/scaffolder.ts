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
import { join, dirname } from "node:path";
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
 * Default progress.txt content for a new feature
 */
export function createProgressTemplate(featureName: string): string {
  return `# Progress Log: ${featureName}
Started: ${new Date().toISOString()}

## Codebase Patterns

<!-- Patterns discovered during development will be added here -->

---
`;
}

/**
 * Initialize Relentless in a project
 */
export async function initProject(projectDir: string = process.cwd()): Promise<void> {
  console.log(chalk.bold.blue("\n🚀 Initializing Relentless\n"));

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

    if (existsSync(path)) {
      console.log(`  ${chalk.yellow("⚠")} relentless/${filename} already exists, skipping`);
      continue;
    }

    await Bun.write(path, contentFn());
    console.log(`  ${chalk.green("✓")} relentless/${filename}`);
  }

  // Copy constitution template
  const constitutionSourcePath = join(relentlessRoot, "templates", "constitution.md");
  const constitutionDestPath = join(relentlessDir, "constitution.md");

  if (existsSync(constitutionSourcePath) && !existsSync(constitutionDestPath)) {
    const constitutionContent = await Bun.file(constitutionSourcePath).text();
    await Bun.write(constitutionDestPath, constitutionContent);
    console.log(`  ${chalk.green("✓")} relentless/constitution.md`);
  } else if (existsSync(constitutionDestPath)) {
    console.log(`  ${chalk.yellow("⚠")} relentless/constitution.md already exists, skipping`);
  }

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

  const sourceSkillsDir = join(relentlessRoot, "skills");

  if (existsSync(sourceSkillsDir)) {
    for (const skill of ["prd", "relentless"]) {
      const sourcePath = join(sourceSkillsDir, skill);
      const destPath = join(skillsDir, skill);

      if (existsSync(sourcePath) && !existsSync(destPath)) {
        await Bun.spawn(["cp", "-r", sourcePath, destPath]).exited;
        console.log(`  ${chalk.green("✓")} .claude/skills/${skill}`);
      } else if (existsSync(destPath)) {
        console.log(`  ${chalk.yellow("⚠")} .claude/skills/${skill} already exists, skipping`);
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
  console.log(chalk.dim("1. Create a PRD:"));
  console.log(`   ${chalk.cyan('claude "Load the prd skill and create a PRD for [your feature]"')}`);
  console.log(chalk.dim("\n2. Convert to JSON:"));
  console.log(`   ${chalk.cyan("relentless convert relentless/features/<feature>/prd.md --feature <feature-name>")}`);
  console.log(chalk.dim("\n3. Run Relentless:"));
  console.log(`   ${chalk.cyan("relentless run --feature <feature-name>")}`);
  console.log("");
}

/**
 * Create a new feature folder
 */
export async function createFeature(
  projectDir: string,
  featureName: string
): Promise<string> {
  const featureDir = join(projectDir, "relentless", "features", featureName);

  if (existsSync(featureDir)) {
    throw new Error(`Feature '${featureName}' already exists`);
  }

  mkdirSync(featureDir, { recursive: true });

  // Create progress.txt
  const progressPath = join(featureDir, "progress.txt");
  await Bun.write(progressPath, createProgressTemplate(featureName));

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
