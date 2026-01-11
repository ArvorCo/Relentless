/**
 * GitHub Issues Generator
 *
 * Converts user stories to GitHub issues via gh CLI
 */

import type { PRD, UserStory } from "./types";
import { inferStoryType } from "./types";
import chalk from "chalk";

/**
 * Validate git remote matches expected repository
 */
async function validateGitRemote(): Promise<{ owner: string; repo: string }> {
  const proc = Bun.spawn(["git", "remote", "get-url", "origin"]);
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Failed to get git remote: exit code ${exitCode}`);
  }

  const url = output.trim();

  // Parse GitHub remote URL
  // Supports: git@github.com:owner/repo.git and https://github.com/owner/repo.git
  const sshMatch = url.match(/git@github\.com:(.+?)\/(.+?)(?:\.git)?$/);
  const httpsMatch = url.match(/https:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);

  const match = sshMatch || httpsMatch;
  if (!match) {
    throw new Error(`Invalid GitHub remote URL: ${url}`);
  }

  return { owner: match[1], repo: match[2] };
}

/**
 * Infer labels from story content
 */
function inferLabels(story: UserStory): string[] {
  const labels: string[] = [];
  const type = inferStoryType(story);

  // Add primary type label
  if (type !== "general") {
    labels.push(type);
  }

  // Add priority label
  if (story.priority <= 3) {
    labels.push("priority:high");
  } else if (story.priority <= 6) {
    labels.push("priority:medium");
  } else {
    labels.push("priority:low");
  }

  // Add phase label if present
  if (story.phase) {
    labels.push(`phase:${story.phase.toLowerCase()}`);
  }

  // Add research label if required
  if (story.research) {
    labels.push("research");
  }

  return labels;
}

/**
 * Format story as GitHub issue body
 */
function formatIssueBody(story: UserStory): string {
  const parts: string[] = [];

  // Description
  parts.push("## Description");
  parts.push("");
  parts.push(story.description);
  parts.push("");

  // Acceptance Criteria
  parts.push("## Acceptance Criteria");
  parts.push("");
  for (const criterion of story.acceptanceCriteria) {
    parts.push(`- [ ] ${criterion}`);
  }
  parts.push("");

  // Dependencies (if any)
  if (story.dependencies && story.dependencies.length > 0) {
    parts.push("## Dependencies");
    parts.push("");
    parts.push("This story depends on:");
    for (const depId of story.dependencies) {
      parts.push(`- ${depId}`);
    }
    parts.push("");
  }

  // Phase (if present)
  if (story.phase) {
    parts.push(`**Phase:** ${story.phase}`);
    parts.push("");
  }

  // Parallel (if applicable)
  if (story.parallel) {
    parts.push("**Can be executed in parallel** with other stories");
    parts.push("");
  }

  // Research (if required)
  if (story.research) {
    parts.push("⚠️ **Research Phase Required**: This story requires a research phase before implementation.");
    parts.push("");
  }

  // Notes (if present)
  if (story.notes && story.notes.trim() !== "") {
    parts.push("## Notes");
    parts.push("");
    parts.push(story.notes);
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Create a GitHub issue for a user story
 */
async function createIssue(story: UserStory, labels: string[]): Promise<string> {
  const title = `[${story.id}] ${story.title}`;
  const body = formatIssueBody(story);

  // Build gh command
  const args = [
    "issue",
    "create",
    "--title",
    title,
    "--body",
    body,
  ];

  // Add labels
  if (labels.length > 0) {
    args.push("--label");
    args.push(labels.join(","));
  }

  const proc = Bun.spawn(["gh", ...args]);
  const output = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Failed to create issue for ${story.id}: ${stderr}`);
  }

  // Extract issue URL from output (gh returns the URL)
  return output.trim();
}

/**
 * Check if gh CLI is installed
 */
async function checkGhCLI(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["gh", "--version"]);
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch (error) {
    // Log unexpected errors (not just "command not found")
    if (error instanceof Error && !error.message.includes("ENOENT")) {
      console.warn(`Unexpected error checking gh CLI: ${error.message}`);
    }
    return false;
  }
}

/**
 * Convert PRD user stories to GitHub issues
 */
export async function generateGitHubIssues(
  prd: PRD,
  options: {
    dryRun?: boolean;
    onlyIncomplete?: boolean;
  } = {}
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const { dryRun = false, onlyIncomplete = true } = options;

  // Check gh CLI
  const hasGh = await checkGhCLI();
  if (!hasGh) {
    throw new Error("GitHub CLI (gh) is not installed. Install it from: https://cli.github.com/");
  }

  // Validate git remote
  console.log(chalk.dim("Validating git remote..."));
  const remote = await validateGitRemote();
  console.log(chalk.dim(`Repository: ${remote.owner}/${remote.repo}`));

  // Filter stories
  const stories = onlyIncomplete
    ? prd.userStories.filter((s) => !s.passes)
    : prd.userStories;

  if (stories.length === 0) {
    console.log(chalk.yellow("No stories to convert to issues."));
    return { created: 0, skipped: 0, errors: [] };
  }

  console.log(chalk.dim(`Found ${stories.length} stories to convert\n`));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const story of stories) {
    const labels = inferLabels(story);

    if (dryRun) {
      console.log(chalk.cyan(`[DRY RUN] ${story.id}: ${story.title}`));
      console.log(chalk.dim(`  Labels: ${labels.join(", ")}`));
      if (story.dependencies && story.dependencies.length > 0) {
        console.log(chalk.dim(`  Dependencies: ${story.dependencies.join(", ")}`));
      }
      created++;
    } else {
      try {
        const issueUrl = await createIssue(story, labels);
        console.log(chalk.green(`✓ ${story.id}: ${story.title}`));
        console.log(chalk.dim(`  ${issueUrl}`));
        created++;
      } catch (error) {
        console.log(chalk.red(`✗ ${story.id}: ${story.title}`));
        console.log(chalk.dim(`  ${(error as Error).message}`));
        errors.push(`${story.id}: ${(error as Error).message}`);
      }
    }
  }

  return { created, skipped, errors };
}
