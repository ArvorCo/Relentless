/**
 * Project Scaffolder
 *
 * Creates Relentless files in a project
 */

import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import chalk from "chalk";
import { getInstalledAgents, checkAgentHealth } from "../agents/registry";
import { DEFAULT_CONFIG } from "../config/schema";

/**
 * Files to create in the project
 */
const FILES = {
  "relentless.config.json": () => JSON.stringify(DEFAULT_CONFIG, null, 2),
  "prompt.md": () => PROMPT_TEMPLATE,
  "CLAUDE.md": () => CLAUDE_MD_TEMPLATE,
  "progress.txt": () => `# Relentless Progress Log\nStarted: ${new Date().toISOString()}\n---\n`,
};

const PROMPT_TEMPLATE = `# Relentless Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at \`prd.json\` (in the same directory as this file)
2. Read the progress log at \`progress.txt\` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD \`branchName\`. If not, check it out or create from main.
4. Pick the **highest priority** user story where \`passes: false\`
5. Implement that single user story
6. Run quality checks (e.g., typecheck, lint, test - use whatever your project requires)
7. Update AGENTS.md/CLAUDE.md files if you discover reusable patterns
8. If checks pass, commit ALL changes with message: \`feat: [Story ID] - [Story Title]\`
9. Update the PRD to set \`passes: true\` for the completed story
10. Append your progress to \`progress.txt\`

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

## Stop Condition

After completing a user story, check if ALL stories have \`passes: true\`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with \`passes: false\`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
`;

const CLAUDE_MD_TEMPLATE = `# Project Agent Instructions

This project uses Relentless for autonomous AI agent orchestration.

## Getting Started

\`\`\`bash
# Run the orchestrator with Claude Code
./relentless/bin/relentless.sh --agent claude

# Or use other agents
./relentless/bin/relentless.sh --agent amp
./relentless/bin/relentless.sh --agent auto  # Smart routing
\`\`\`

## Codebase Patterns

<!-- Add patterns discovered during development here -->

## Development Commands

\`\`\`bash
# Add your project's commands here
# bun run typecheck
# bun run lint
# bun run test
\`\`\`
`;

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

  // Create files
  console.log(chalk.dim("\nCreating files..."));

  for (const [filename, contentFn] of Object.entries(FILES)) {
    const path = join(projectDir, filename);

    if (existsSync(path)) {
      console.log(`  ${chalk.yellow("⚠")} ${filename} already exists, skipping`);
      continue;
    }

    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    await Bun.write(path, contentFn());
    console.log(`  ${chalk.green("✓")} ${filename}`);
  }

  // Create AGENTS.md symlink
  const agentsMdPath = join(projectDir, "AGENTS.md");
  if (!existsSync(agentsMdPath)) {
    await Bun.spawn(["ln", "-sf", "CLAUDE.md", "AGENTS.md"], { cwd: projectDir }).exited;
    console.log(`  ${chalk.green("✓")} AGENTS.md -> CLAUDE.md (symlink)`);
  }

  // Copy relentless bin
  console.log(chalk.dim("\nSetting up relentless scripts..."));
  const relentlessRoot = dirname(dirname(dirname(import.meta.path)));
  const relentlessBinDir = join(projectDir, "relentless", "bin");

  if (!existsSync(relentlessBinDir)) {
    mkdirSync(relentlessBinDir, { recursive: true });
  }

  const sourceScript = join(relentlessRoot, "bin", "relentless.sh");
  const destScript = join(relentlessBinDir, "relentless.sh");

  if (existsSync(sourceScript) && !existsSync(destScript)) {
    await Bun.spawn(["cp", sourceScript, destScript]).exited;
    await Bun.spawn(["chmod", "+x", destScript]).exited;
    console.log(`  ${chalk.green("✓")} relentless/bin/relentless.sh`);
  }

  // Copy skills
  console.log(chalk.dim("\nSetting up skills..."));
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
        console.log(`  ${chalk.green("✓")} Installed skill: ${skill}`);
      }
    }
  }

  // Print next steps
  console.log(chalk.bold.green("\n✅ Relentless initialized!\n"));
  console.log("Next steps:");
  console.log(chalk.dim("1. Create a PRD:"));
  console.log(`   ${chalk.cyan('claude "Load the prd skill and create a PRD for [your feature]"')}`);
  console.log(chalk.dim("\n2. Convert to JSON:"));
  console.log(`   ${chalk.cyan('claude "Load the relentless skill and convert tasks/prd-*.md"')}`);
  console.log(chalk.dim("\n3. Run Relentless:"));
  console.log(`   ${chalk.cyan("./relentless/bin/relentless.sh --agent claude")}`);
  console.log("");
}
