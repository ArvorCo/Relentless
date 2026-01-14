/**
 * CLI Queue Functions
 *
 * Functions for queue CLI commands.
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { findRelentlessDir } from "../config";
import { addToQueue } from "../queue";

/** Result of a queue add operation */
export interface QueueAddResult {
  success: boolean;
  message?: string;
  error?: string;
}

/** Options for queueAdd function */
export interface QueueAddOptions {
  message: string;
  featurePath: string;
}

/** Result of resolving a feature path */
export interface ResolveFeaturePathResult {
  path?: string;
  error?: string;
}

/**
 * Resolves the feature path from a working directory and feature name.
 *
 * @param workingDir - The working directory (project root)
 * @param featureName - The feature name
 * @returns The resolved feature path or an error
 */
export async function resolveFeaturePath(
  workingDir: string,
  featureName: string
): Promise<ResolveFeaturePathResult> {
  const relentlessDir = findRelentlessDir(workingDir);

  if (!relentlessDir) {
    return {
      error: "Relentless not initialized. Run: relentless init",
    };
  }

  const featurePath = join(relentlessDir, "features", featureName);

  if (!existsSync(featurePath)) {
    return {
      error: `Feature '${featureName}' not found`,
    };
  }

  return { path: featurePath };
}

/**
 * Adds a message to the queue for a feature.
 *
 * @param options - The queue add options
 * @returns The result of the operation
 */
export async function queueAdd(options: QueueAddOptions): Promise<QueueAddResult> {
  const { message, featurePath } = options;

  // Validate feature path exists
  if (!existsSync(featurePath)) {
    return {
      success: false,
      error: `Feature path not found: ${featurePath}`,
    };
  }

  try {
    await addToQueue(featurePath, message);

    return {
      success: true,
      message: `Added to queue: ${message}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add to queue: ${(error as Error).message}`,
    };
  }
}
