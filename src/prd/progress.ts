/**
 * Progress Tracking with Metadata
 *
 * Manages progress.txt with YAML frontmatter for machine-readable context
 */

import { existsSync } from "node:fs";
import yaml from "js-yaml";

/**
 * Progress metadata stored in YAML frontmatter
 */
export interface ProgressMetadata {
  /** Feature name */
  feature: string;
  /** When the feature was started */
  started: string;
  /** Last update timestamp */
  last_updated: string;
  /** Number of stories completed */
  stories_completed: number;
  /** Patterns learned during development */
  patterns: string[];
}

/**
 * Progress file with frontmatter and content
 */
export interface ProgressFile {
  /** Parsed frontmatter metadata */
  metadata: ProgressMetadata;
  /** Content after frontmatter (logs and patterns) */
  content: string;
}

/**
 * Parse progress.txt with YAML frontmatter
 */
export function parseProgress(content: string): ProgressFile {
  // Check for frontmatter delimiter
  if (!content.startsWith("---\n")) {
    // Legacy format without frontmatter - create default metadata
    const lines = content.split("\n");
    const featureLine = lines.find((l) => l.startsWith("# Progress Log:"));
    const feature = featureLine ? featureLine.replace("# Progress Log:", "").trim() : "unknown";
    const startedLine = lines.find((l) => l.startsWith("Started:"));
    const started = startedLine ? startedLine.replace("Started:", "").trim() : new Date().toISOString();

    return {
      metadata: {
        feature,
        started,
        last_updated: new Date().toISOString(),
        stories_completed: 0,
        patterns: [],
      },
      content,
    };
  }

  // Find closing delimiter
  const endIndex = content.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    throw new Error("Progress file has opening --- but no closing --- delimiter");
  }

  // Extract frontmatter
  const frontmatterText = content.substring(4, endIndex);
  const metadata = yaml.load(frontmatterText) as ProgressMetadata;

  // Extract content after frontmatter
  const contentAfterFrontmatter = content.substring(endIndex + 5); // Skip "\n---\n"

  return {
    metadata,
    content: contentAfterFrontmatter,
  };
}

/**
 * Serialize progress file back to string with frontmatter
 */
export function serializeProgress(progress: ProgressFile): string {
  const frontmatter = yaml.dump(progress.metadata, {
    indent: 2,
    lineWidth: -1, // Disable line wrapping
  });

  return `---\n${frontmatter}---\n${progress.content}`;
}

/**
 * Load progress file
 */
export async function loadProgress(progressPath: string): Promise<ProgressFile | null> {
  if (!existsSync(progressPath)) {
    return null;
  }

  const content = await Bun.file(progressPath).text();
  return parseProgress(content);
}

/**
 * Update progress metadata
 */
export async function updateProgressMetadata(
  progressPath: string,
  updates: Partial<ProgressMetadata>
): Promise<void> {
  const progress = await loadProgress(progressPath);
  if (!progress) {
    throw new Error(`Progress file not found: ${progressPath}`);
  }

  // Merge updates
  progress.metadata = {
    ...progress.metadata,
    ...updates,
    last_updated: new Date().toISOString(),
  };

  // Write back
  await Bun.write(progressPath, serializeProgress(progress));
}

/**
 * Append entry to progress log
 */
export async function appendProgress(progressPath: string, entry: string): Promise<void> {
  const progress = await loadProgress(progressPath);
  if (!progress) {
    throw new Error(`Progress file not found: ${progressPath}`);
  }

  // Append entry
  progress.content += `\n${entry}`;

  // Update last_updated
  progress.metadata.last_updated = new Date().toISOString();

  // Write back
  await Bun.write(progressPath, serializeProgress(progress));
}

/**
 * Extract patterns from progress content
 */
export function extractPatterns(content: string): string[] {
  const patterns: string[] = [];
  const lines = content.split("\n");

  let inLearningsSection = false;
  for (const line of lines) {
    // Check for "Learnings for future iterations:" header
    if (line.includes("Learnings for future iterations:")) {
      inLearningsSection = true;
      continue;
    }

    // Check for section end
    if (line.trim() === "---" || line.startsWith("##")) {
      inLearningsSection = false;
      continue;
    }

    // Extract patterns from learnings sections
    if (inLearningsSection && line.trim().startsWith("-")) {
      const pattern = line.trim().substring(1).trim(); // Remove leading "- "
      if (pattern && pattern.startsWith("**")) {
        // Pattern format: **Key**: Description
        patterns.push(pattern);
      }
    }
  }

  return patterns;
}

/**
 * Update patterns in frontmatter from content
 */
export async function syncPatternsFromContent(progressPath: string): Promise<void> {
  const progress = await loadProgress(progressPath);
  if (!progress) {
    return;
  }

  // Extract patterns from content
  const patterns = extractPatterns(progress.content);

  // Update metadata
  progress.metadata.patterns = patterns;
  progress.metadata.last_updated = new Date().toISOString();

  // Write back
  await Bun.write(progressPath, serializeProgress(progress));
}
