/**
 * PRD Parser
 *
 * Parses PRD markdown files and converts them to prd.json format
 */

import { PRDSchema, type PRD, type UserStory, type ExecutionHistory, type EscalationAttempt } from "./types";
import type { Mode, HarnessName } from "../config/schema";
import { validateCriterion, type FilteredCriterion } from "./validator";

/**
 * Parse warning for filtered criteria
 */
export interface ParseWarning {
  type: "filtered_criterion" | "format_normalized" | "dependency_format";
  storyId: string;
  text: string;
  reason: string;
  suggestion?: string;
  line?: number;
}

/**
 * Extended parse result with warnings
 */
export interface ParseResult {
  prd: Partial<PRD>;
  warnings: ParseWarning[];
  filteredCriteria: FilteredCriterion[];
}

/**
 * Check if a criterion line is valid (not a file path, divider, etc.)
 *
 * Now uses the validator module for consistent filtering logic.
 */
function isValidCriterion(text: string): boolean {
  const result = validateCriterion(text);
  return result.valid;
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

    // Parse routing preference line
    if (trimmed.match(/^(\*\*Routing Preference\*\*|Routing Preference):/i)) {
      const raw = trimmed.replace(/^(\*\*Routing Preference\*\*|Routing Preference):/i, "").trim();
      const lower = raw.toLowerCase();
      const modeMatch = lower.match(/\b(free|cheap|good|genius)\b/);
      const allowFreeMatch = lower.match(/allow\s+free:\s*(yes|no)/);
      const harnessMatch = lower.match(/\b(claude|amp|opencode|codex|droid|gemini)\b/);
      const modelMatch = raw.match(/\/([^\s]+)/);

      prd.routingPreference = {
        raw,
        type: lower.includes("auto") ? "auto" : harnessMatch ? "harness" : undefined,
        mode: modeMatch ? (modeMatch[1] as Mode) : undefined,
        allowFree: allowFreeMatch ? allowFreeMatch[1] === "yes" : undefined,
        harness: harnessMatch ? (harnessMatch[1] as HarnessName) : undefined,
        model: modelMatch ? modelMatch[1].replace(/[,)]$/, "") : undefined,
      };
      continue;
    }

    // Parse section headers (## Section)
    // This ends the current story (if any) and starts a new section
    if (trimmed.startsWith("## ")) {
      // Save current story before switching sections
      if (currentStory && currentStory.id) {
        if (descriptionLines.length > 0 && !currentStory.description) {
          currentStory.description = descriptionLines.join(" ").trim();
        }
        prd.userStories!.push(currentStory as UserStory);
        currentStory = null;
        descriptionLines = [];
      }
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
    // Extracts only valid story IDs (US-XXX pattern), ignoring annotations like "(foundational)"
    if (currentStory && trimmed.match(/^\*\*Dependencies:?\*\*/i)) {
      const depsText = trimmed.replace(/^\*\*Dependencies:?\*\*/i, "").trim();
      const deps = depsText
        .split(/[,;]/)
        .map((d) => {
          // Extract US-XXX pattern from strings like "US-001 (authentication must work first)"
          const match = d.match(/US-\d+/i);
          return match ? match[0].toUpperCase() : null;
        })
        .filter((d): d is string => d !== null);
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
 * Parse a PRD markdown file with detailed warnings about filtered content
 *
 * This version tracks all filtering decisions and provides actionable feedback.
 */
export function parsePRDMarkdownWithWarnings(content: string): ParseResult {
  const lines = content.split("\n");
  const prd: Partial<PRD> = {
    userStories: [],
  };
  const warnings: ParseWarning[] = [];
  const filteredCriteria: FilteredCriterion[] = [];

  let currentSection = "";
  let currentStory: Partial<UserStory> | null = null;
  let currentStoryId = "";
  let storyCount = 0;
  let inAcceptanceCriteria = false;
  let descriptionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Parse title (# PRD: Title or # Title)
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      prd.project = trimmed.replace(/^#\s*(PRD:\s*)?/, "").trim();
      continue;
    }

    // Parse routing preference line
    if (trimmed.match(/^(\*\*Routing Preference\*\*|Routing Preference):/i)) {
      const raw = trimmed.replace(/^(\*\*Routing Preference\*\*|Routing Preference):/i, "").trim();
      const lower = raw.toLowerCase();
      const modeMatch = lower.match(/\b(free|cheap|good|genius)\b/);
      const allowFreeMatch = lower.match(/allow\s+free:\s*(yes|no)/);
      const harnessMatch = lower.match(/\b(claude|amp|opencode|codex|droid|gemini)\b/);
      const modelMatch = raw.match(/\/([^\s]+)/);

      prd.routingPreference = {
        raw,
        type: lower.includes("auto") ? "auto" : harnessMatch ? "harness" : undefined,
        mode: modeMatch ? (modeMatch[1] as Mode) : undefined,
        allowFree: allowFreeMatch ? allowFreeMatch[1] === "yes" : undefined,
        harness: harnessMatch ? (harnessMatch[1] as HarnessName) : undefined,
        model: modelMatch ? modelMatch[1].replace(/[,)]$/, "") : undefined,
      };
      continue;
    }

    // Parse section headers (## Section)
    if (trimmed.startsWith("## ")) {
      if (currentStory && currentStory.id) {
        if (descriptionLines.length > 0 && !currentStory.description) {
          currentStory.description = descriptionLines.join(" ").trim();
        }
        prd.userStories!.push(currentStory as UserStory);
        currentStory = null;
        descriptionLines = [];
      }
      currentSection = trimmed.replace("## ", "").toLowerCase();
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse user stories
    const storyMatch = trimmed.match(/^###\s+(?:US-(\d+)|Story\s+(\d+)|(\d+)\.?)\s*:?\s*(.*)$/i);
    if (storyMatch) {
      if (currentStory && currentStory.id) {
        if (descriptionLines.length > 0 && !currentStory.description) {
          currentStory.description = descriptionLines.join(" ").trim();
        }
        prd.userStories!.push(currentStory as UserStory);
      }

      storyCount++;
      const storyNum = storyMatch[1] || storyMatch[2] || storyMatch[3] || String(storyCount);
      currentStoryId = `US-${storyNum.padStart(3, "0")}`;

      // Track format normalization
      if (storyMatch[2]) {
        warnings.push({
          type: "format_normalized",
          storyId: currentStoryId,
          text: trimmed,
          reason: `"Story ${storyMatch[2]}" format normalized to "${currentStoryId}"`,
          line: lineNum,
        });
      } else if (storyMatch[3]) {
        warnings.push({
          type: "format_normalized",
          storyId: currentStoryId,
          text: trimmed,
          reason: `Numbered format normalized to "${currentStoryId}"`,
          line: lineNum,
        });
      }

      currentStory = {
        id: currentStoryId,
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

    // Parse story description
    if (currentStory && trimmed.startsWith("**Description:**")) {
      currentStory.description = trimmed.replace("**Description:**", "").trim();
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse dependencies with format warnings
    if (currentStory && trimmed.match(/^\*\*Dependencies:?\*\*/i)) {
      const depsText = trimmed.replace(/^\*\*Dependencies:?\*\*/i, "").trim();
      const deps = depsText
        .split(/[,;]/)
        .map((d) => {
          // Check for underscore format and warn
          const underscoreMatch = d.match(/US_(\d+)/i);
          if (underscoreMatch) {
            const normalized = `US-${underscoreMatch[1].padStart(3, "0")}`;
            warnings.push({
              type: "dependency_format",
              storyId: currentStoryId,
              text: d.trim(),
              reason: `Dependency uses underscore format instead of dash`,
              suggestion: `Use "${normalized}" instead of "${d.trim()}"`,
              line: lineNum,
            });
          }

          const match = d.match(/US[-_]?(\d+)/i);
          return match ? `US-${match[1].padStart(3, "0")}` : null;
        })
        .filter((d): d is string => d !== null);
      if (deps.length > 0) {
        currentStory.dependencies = deps;
      }
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse parallel flag
    if (currentStory && trimmed.match(/^\*\*Parallel:?\*\*/i)) {
      const value = trimmed.replace(/^\*\*Parallel:?\*\*/i, "").trim().toLowerCase();
      currentStory.parallel = value === "true" || value === "yes";
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse phase
    if (currentStory && trimmed.match(/^\*\*Phase:?\*\*/i)) {
      const phase = trimmed.replace(/^\*\*Phase:?\*\*/i, "").trim();
      if (phase) {
        currentStory.phase = phase;
      }
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse research flag
    if (currentStory && trimmed.match(/^\*\*Research:?\*\*/i)) {
      const value = trimmed.replace(/^\*\*Research:?\*\*/i, "").trim().toLowerCase();
      currentStory.research = value === "true" || value === "yes";
      inAcceptanceCriteria = false;
      continue;
    }

    // Check for section headers that end acceptance criteria
    if (currentStory && trimmed.match(/^\*\*(Files|Note|Technical|Design)/i)) {
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse acceptance criteria with filtering feedback
    if (currentStory && trimmed.startsWith("-")) {
      if (trimmed.match(/^-+$/)) {
        inAcceptanceCriteria = false;
        continue;
      }

      if (trimmed.match(/^-\s*\[.\]/)) {
        const criterion = trimmed.replace(/^-\s*\[.\]\s*/, "").trim();
        if (criterion) {
          const validation = validateCriterion(criterion);
          if (validation.valid) {
            currentStory.acceptanceCriteria!.push(criterion);
          } else {
            filteredCriteria.push({
              storyId: currentStoryId,
              text: criterion,
              reason: validation.reason!,
              line: lineNum,
              suggestion: validation.suggestion,
            });
            warnings.push({
              type: "filtered_criterion",
              storyId: currentStoryId,
              text: criterion,
              reason: validation.reason!,
              suggestion: validation.suggestion,
              line: lineNum,
            });
          }
        }
        inAcceptanceCriteria = true;
        continue;
      }

      if (inAcceptanceCriteria) {
        const criterion = trimmed.replace(/^-\s*/, "").trim();
        if (criterion) {
          const validation = validateCriterion(criterion);
          if (validation.valid) {
            currentStory.acceptanceCriteria!.push(criterion);
          } else {
            filteredCriteria.push({
              storyId: currentStoryId,
              text: criterion,
              reason: validation.reason!,
              line: lineNum,
              suggestion: validation.suggestion,
            });
            warnings.push({
              type: "filtered_criterion",
              storyId: currentStoryId,
              text: criterion,
              reason: validation.reason!,
              suggestion: validation.suggestion,
              line: lineNum,
            });
          }
        }
        continue;
      }
    }

    // Collect description lines
    if (currentStory && !inAcceptanceCriteria && trimmed && !trimmed.startsWith("**") && !trimmed.startsWith("#")) {
      descriptionLines.push(trimmed);
    }

    // Parse description if in introduction/overview section
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

  return { prd, warnings, filteredCriteria };
}

/**
 * Generate branch name from project name
 */
export function generateBranchName(projectName: string, featureName?: string): string {
  let kebab = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // If featureName has a number prefix (NNN-name), prepend it to branch name
  if (featureName) {
    const match = featureName.match(/^(\d{3})-/);
    if (match) {
      const numberPrefix = match[1];
      kebab = `${numberPrefix}-${kebab}`;
    }
  }

  return `ralph/${kebab}`;
}

/**
 * Convert parsed PRD to complete PRD with defaults
 */
export function createPRD(parsed: Partial<PRD>, featureName?: string): PRD {
  const project = parsed.project ?? "Unnamed Project";
  const prd: PRD = {
    project,
    branchName: parsed.branchName ?? generateBranchName(project, featureName),
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

  if (parsed.routingPreference) {
    prd.routingPreference = parsed.routingPreference;
  }

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

/**
 * Result of marking a story as skipped
 */
export interface MarkSkippedResult {
  success: boolean;
  error?: string;
  alreadySkipped?: boolean;
}

/**
 * Result of prioritizing a story
 */
export interface PrioritizeStoryResult {
  success: boolean;
  error?: string;
  previousPriority?: number;
}

/**
 * Mark a story as skipped in the PRD file
 *
 * @param prdPath - Path to the prd.json file
 * @param storyId - The ID of the story to skip
 * @returns Result indicating success or failure
 */
export async function markStoryAsSkipped(
  prdPath: string,
  storyId: string
): Promise<MarkSkippedResult> {
  // Load current PRD
  const prd = await loadPRD(prdPath);

  // Find the story
  const storyIndex = prd.userStories.findIndex((s) => s.id === storyId);
  if (storyIndex === -1) {
    return {
      success: false,
      error: `Story ${storyId} not found in PRD`,
    };
  }

  const story = prd.userStories[storyIndex];

  // Check if story is already completed
  if (story.passes) {
    return {
      success: false,
      error: `Story ${storyId} is already completed and cannot be skipped`,
    };
  }

  // Check if already skipped
  if (story.skipped) {
    return {
      success: true,
      alreadySkipped: true,
    };
  }

  // Mark as skipped
  prd.userStories[storyIndex] = {
    ...story,
    skipped: true,
    notes: story.notes
      ? `${story.notes}\n[SKIPPED] ${new Date().toISOString().split("T")[0]}`
      : `[SKIPPED] ${new Date().toISOString().split("T")[0]}`,
  };

  // Save the updated PRD
  await savePRD(prd, prdPath);

  return {
    success: true,
  };
}

/**
 * Prioritize a story to be the next one worked on
 *
 * Sets the story's priority to 0 (highest priority) so it becomes
 * the next story selected by getNextStory().
 *
 * @param prdPath - Path to the prd.json file
 * @param storyId - The ID of the story to prioritize
 * @returns Result indicating success or failure
 */
export async function prioritizeStory(
  prdPath: string,
  storyId: string
): Promise<PrioritizeStoryResult> {
  // Load current PRD
  const prd = await loadPRD(prdPath);

  // Find the story
  const storyIndex = prd.userStories.findIndex((s) => s.id === storyId);
  if (storyIndex === -1) {
    return {
      success: false,
      error: `Story ${storyId} not found in PRD`,
    };
  }

  const story = prd.userStories[storyIndex];

  // Check if story is already completed
  if (story.passes) {
    return {
      success: false,
      error: `Story ${storyId} is already completed and cannot be prioritized`,
    };
  }

  // Check if story is skipped
  if (story.skipped) {
    return {
      success: false,
      error: `Story ${storyId} is skipped and cannot be prioritized`,
    };
  }

  const previousPriority = story.priority;

  // Set priority to 0 (highest priority)
  prd.userStories[storyIndex] = {
    ...story,
    priority: 0,
    notes: story.notes
      ? `${story.notes}\n[PRIORITIZED] ${new Date().toISOString().split("T")[0]} (was priority ${previousPriority})`
      : `[PRIORITIZED] ${new Date().toISOString().split("T")[0]} (was priority ${previousPriority})`,
  };

  // Save the updated PRD
  await savePRD(prd, prdPath);

  return {
    success: true,
    previousPriority,
  };
}

/**
 * Result of updating story execution history
 */
export interface UpdateExecutionResult {
  success: boolean;
  error?: string;
}

/**
 * Update a story's execution history after it completes
 *
 * @param prdPath - Path to the prd.json file
 * @param storyId - The ID of the completed story
 * @param executionData - Execution data to save
 * @returns Result indicating success or failure
 */
export async function updateStoryExecution(
  prdPath: string,
  storyId: string,
  executionData: {
    attempts: number;
    escalations: EscalationAttempt[];
    actualCost: number;
    actualHarness: HarnessName;
    actualModel: string;
    inputTokens?: number;
    outputTokens?: number;
  }
): Promise<UpdateExecutionResult> {
  // Load current PRD
  const prd = await loadPRD(prdPath);

  // Find the story
  const storyIndex = prd.userStories.findIndex((s) => s.id === storyId);
  if (storyIndex === -1) {
    return {
      success: false,
      error: `Story ${storyId} not found in PRD`,
    };
  }

  // Build execution history
  const executionHistory: ExecutionHistory = {
    attempts: executionData.attempts,
    escalations: executionData.escalations,
    actualCost: executionData.actualCost,
    actualHarness: executionData.actualHarness,
    actualModel: executionData.actualModel,
    inputTokens: executionData.inputTokens,
    outputTokens: executionData.outputTokens,
  };

  // Update the story with execution history
  prd.userStories[storyIndex] = {
    ...prd.userStories[storyIndex],
    execution: executionHistory,
  };

  // Save the updated PRD
  await savePRD(prd, prdPath);

  return {
    success: true,
  };
}
