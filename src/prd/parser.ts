/**
 * PRD Parser
 *
 * Parses PRD markdown files and converts them to prd.json format
 */

import { PRDSchema, type PRD, type UserStory } from "./types";

/**
 * Check if a criterion line is valid (not a file path, divider, etc.)
 */
function isValidCriterion(text: string): boolean {
  // Skip if it looks like a file path
  if (text.match(/^`[^`]+\.(ts|tsx|js|jsx|css|json|md)`$/)) {
    return false;
  }
  // Skip if it's just a section marker
  if (text.startsWith("**")) {
    return false;
  }
  // Skip if it's empty or too short
  if (text.length < 3) {
    return false;
  }
  return true;
}

/**
 * Parse a PRD markdown file into structured format
 *
 * Supports multiple story formats:
 * - ### US-001: Title
 * - ### Story 1: Title
 * - ### 1. Title
 *
 * Supports multiple acceptance criteria formats:
 * - [ ] Criterion
 * - [x] Criterion
 * - Criterion (plain bullet)
 */
export function parsePRDMarkdown(content: string): Partial<PRD> {
  const lines = content.split("\n");
  const prd: Partial<PRD> = {
    userStories: [],
  };

  let currentSection = "";
  let currentStory: Partial<UserStory> | null = null;
  let storyCount = 0;
  let inAcceptanceCriteria = false;
  let descriptionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse title (# PRD: Title or # Title)
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      prd.project = trimmed.replace(/^#\s*(PRD:\s*)?/, "").trim();
      continue;
    }

    // Parse section headers (## Section)
    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.replace("## ", "").toLowerCase();
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse user stories - multiple formats supported
    // ### US-001: Title
    // ### Story 1: Title
    // ### 1. Title
    const storyMatch = trimmed.match(/^###\s+(?:US-(\d+)|Story\s+(\d+)|(\d+)\.?)\s*:?\s*(.*)$/i);
    if (storyMatch) {
      // Save previous story
      if (currentStory && currentStory.id) {
        if (descriptionLines.length > 0 && !currentStory.description) {
          currentStory.description = descriptionLines.join(" ").trim();
        }
        prd.userStories!.push(currentStory as UserStory);
      }

      storyCount++;
      const storyNum = storyMatch[1] || storyMatch[2] || storyMatch[3] || String(storyCount);
      currentStory = {
        id: `US-${storyNum.padStart(3, "0")}`,
        title: storyMatch[4]?.trim() || "",
        description: "",
        acceptanceCriteria: [],
        priority: storyCount,
        passes: false,
        notes: "",
        dependencies: undefined,
        parallel: undefined,
        phase: undefined,
      };
      inAcceptanceCriteria = false;
      descriptionLines = [];
      continue;
    }

    // Check for acceptance criteria section header
    if (currentStory && trimmed.match(/^\*\*Acceptance Criteria:?\*\*$/i)) {
      inAcceptanceCriteria = true;
      continue;
    }

    // Parse story description (single line after **Description:**)
    if (currentStory && trimmed.startsWith("**Description:**")) {
      currentStory.description = trimmed.replace("**Description:**", "").trim();
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse dependencies (Dependencies: US-001, US-002)
    if (currentStory && trimmed.match(/^\*\*Dependencies:?\*\*/i)) {
      const deps = trimmed
        .replace(/^\*\*Dependencies:?\*\*/i, "")
        .trim()
        .split(/[,;]/)
        .map((d) => d.trim())
        .filter(Boolean);
      if (deps.length > 0) {
        currentStory.dependencies = deps;
      }
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse parallel flag (Parallel: true/yes)
    if (currentStory && trimmed.match(/^\*\*Parallel:?\*\*/i)) {
      const value = trimmed.replace(/^\*\*Parallel:?\*\*/i, "").trim().toLowerCase();
      currentStory.parallel = value === "true" || value === "yes";
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse phase (Phase: Setup)
    if (currentStory && trimmed.match(/^\*\*Phase:?\*\*/i)) {
      const phase = trimmed.replace(/^\*\*Phase:?\*\*/i, "").trim();
      if (phase) {
        currentStory.phase = phase;
      }
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse research flag (Research: true/yes)
    if (currentStory && trimmed.match(/^\*\*Research:?\*\*/i)) {
      const value = trimmed.replace(/^\*\*Research:?\*\*/i, "").trim().toLowerCase();
      currentStory.research = value === "true" || value === "yes";
      inAcceptanceCriteria = false;
      continue;
    }

    // Check for section headers within story that end acceptance criteria
    if (currentStory && trimmed.match(/^\*\*(Files|Note|Technical|Design)/i)) {
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse acceptance criteria - multiple formats
    // - [ ] Criterion
    // - [x] Criterion
    // - Criterion (plain bullet, only in acceptance criteria section)
    if (currentStory && trimmed.startsWith("-")) {
      // Skip dividers like "---"
      if (trimmed.match(/^-+$/)) {
        inAcceptanceCriteria = false;
        continue;
      }

      // Checkbox format
      if (trimmed.match(/^-\s*\[.\]/)) {
        const criterion = trimmed.replace(/^-\s*\[.\]\s*/, "").trim();
        if (criterion && isValidCriterion(criterion)) {
          currentStory.acceptanceCriteria!.push(criterion);
        }
        inAcceptanceCriteria = true;
        continue;
      }
      // Plain bullet format (only if we're in acceptance criteria section)
      if (inAcceptanceCriteria) {
        const criterion = trimmed.replace(/^-\s*/, "").trim();
        if (criterion && isValidCriterion(criterion)) {
          currentStory.acceptanceCriteria!.push(criterion);
        }
        continue;
      }
    }

    // Collect description lines (paragraphs after story header, before acceptance criteria)
    if (currentStory && !inAcceptanceCriteria && trimmed && !trimmed.startsWith("**") && !trimmed.startsWith("#")) {
      descriptionLines.push(trimmed);
    }

    // Parse description if in introduction/overview section (for PRD description)
    if ((currentSection === "introduction" || currentSection === "overview") && !currentStory) {
      if (trimmed && !prd.description && !trimmed.startsWith("**")) {
        prd.description = trimmed;
      }
    }
  }

  // Save last story
  if (currentStory && currentStory.id) {
    if (descriptionLines.length > 0 && !currentStory.description) {
      currentStory.description = descriptionLines.join(" ").trim();
    }
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
      dependencies: story.dependencies,
      parallel: story.parallel,
      phase: story.phase,
      research: story.research,
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
