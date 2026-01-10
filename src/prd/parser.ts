/**
 * PRD Parser
 *
 * Parses PRD markdown files and converts them to prd.json format
 */

import { PRDSchema, type PRD, type UserStory } from "./types";

/**
 * Parse a PRD markdown file into structured format
 */
export function parsePRDMarkdown(content: string): Partial<PRD> {
  const lines = content.split("\n");
  const prd: Partial<PRD> = {
    userStories: [],
  };

  let currentSection = "";
  let currentStory: Partial<UserStory> | null = null;
  let storyCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse title
    if (trimmed.startsWith("# PRD:") || trimmed.startsWith("# ")) {
      prd.project = trimmed.replace(/^#\s*(PRD:\s*)?/, "").trim();
      continue;
    }

    // Parse section headers
    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.replace("## ", "").toLowerCase();
      continue;
    }

    // Parse user stories
    if (trimmed.startsWith("### US-") || trimmed.match(/^###\s+US-\d+/)) {
      // Save previous story
      if (currentStory && currentStory.id) {
        prd.userStories!.push(currentStory as UserStory);
      }

      storyCount++;
      const match = trimmed.match(/###\s+(US-\d+):?\s*(.*)/);
      currentStory = {
        id: match?.[1] ?? `US-${String(storyCount).padStart(3, "0")}`,
        title: match?.[2] ?? "",
        description: "",
        acceptanceCriteria: [],
        priority: storyCount,
        passes: false,
        notes: "",
      };
      continue;
    }

    // Parse story description
    if (currentStory && trimmed.startsWith("**Description:**")) {
      currentStory.description = trimmed.replace("**Description:**", "").trim();
      continue;
    }

    // Parse acceptance criteria
    if (currentStory && (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]"))) {
      const criterion = trimmed.replace(/^-\s*\[.\]\s*/, "").trim();
      currentStory.acceptanceCriteria!.push(criterion);
      continue;
    }

    // Parse description if in introduction section
    if (currentSection === "introduction" || currentSection === "overview") {
      if (trimmed && !prd.description) {
        prd.description = trimmed;
      }
    }
  }

  // Save last story
  if (currentStory && currentStory.id) {
    prd.userStories!.push(currentStory as UserStory);
  }

  return prd;
}

/**
 * Generate branch name from project name
 */
export function generateBranchName(projectName: string): string {
  const kebab = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `ralph/${kebab}`;
}

/**
 * Convert parsed PRD to complete PRD with defaults
 */
export function createPRD(parsed: Partial<PRD>): PRD {
  const project = parsed.project ?? "Unnamed Project";
  const prd: PRD = {
    project,
    branchName: parsed.branchName ?? generateBranchName(project),
    description: parsed.description ?? "",
    userStories: (parsed.userStories ?? []).map((story, index) => ({
      id: story.id ?? `US-${String(index + 1).padStart(3, "0")}`,
      title: story.title ?? "",
      description: story.description ?? "",
      acceptanceCriteria: story.acceptanceCriteria ?? [],
      priority: story.priority ?? index + 1,
      passes: story.passes ?? false,
      notes: story.notes ?? "",
    })),
  };

  // Validate
  return PRDSchema.parse(prd);
}

/**
 * Load PRD from JSON file
 */
export async function loadPRD(path: string): Promise<PRD> {
  const content = await Bun.file(path).text();
  const json = JSON.parse(content);
  return PRDSchema.parse(json);
}

/**
 * Save PRD to JSON file
 */
export async function savePRD(prd: PRD, path: string): Promise<void> {
  const validated = PRDSchema.parse(prd);
  const content = JSON.stringify(validated, null, 2);
  await Bun.write(path, content);
}
