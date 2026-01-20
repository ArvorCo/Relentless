/**
 * CLI --mode Flag Module
 *
 * Provides validation and help text for the `--mode` CLI flag.
 * Used by the `relentless run` command to control cost/quality tradeoff.
 *
 * Features:
 * - Mode validation (free, cheap, good, genius)
 * - Help text generation with descriptions and savings percentages
 * - Default mode handling
 *
 * @module src/cli/mode-flag
 */

import type { Mode } from "../config/schema";

/**
 * Valid mode values for the --mode flag
 */
export const VALID_MODES: readonly Mode[] = ["free", "cheap", "good", "genius"];

/**
 * Default mode when --mode flag is not provided
 */
export const DEFAULT_MODE: Mode = "good";

/**
 * Options for parsing mode flag
 */
export interface ModeFlagOptions {
  /** The value provided to --mode flag */
  value?: string;
  /** Whether to trim whitespace from value */
  trim?: boolean;
}

/**
 * Result of parsing mode flag
 */
export interface ModeFlagResult {
  /** Whether the mode is valid */
  valid: boolean;
  /** The parsed mode (or default if undefined) */
  mode?: Mode;
  /** Error message if invalid */
  error?: string;
}

/**
 * Mode descriptions for help text
 */
const MODE_DESCRIPTIONS: Record<Mode, string> = {
  free: "Use free tier models (saves 100%)",
  cheap: "Use low-cost models (saves ~60-70%)",
  good: "Use balanced models (default)",
  genius: "Use SOTA models for all tasks",
};

/**
 * Mode savings percentages (vs SOTA pricing)
 */
const MODE_SAVINGS: Record<Mode, string> = {
  free: "100%",
  cheap: "60-70%",
  good: "40-50%",
  genius: "0%",
};

/**
 * Check if a string is a valid mode flag value
 *
 * @param value - The value to check
 * @returns True if the value is a valid mode
 *
 * @example
 * ```typescript
 * isValidModeFlag("good");   // true
 * isValidModeFlag("fast");   // false
 * isValidModeFlag("FREE");   // false (case-sensitive)
 * ```
 */
export function isValidModeFlag(value: string): value is Mode {
  return VALID_MODES.includes(value as Mode);
}

/**
 * Parse and validate a mode flag value
 *
 * @param value - The value provided to --mode flag (undefined if not provided)
 * @returns Parsed mode result with validation status
 *
 * @example
 * ```typescript
 * parseModeFlagValue("genius");
 * // { valid: true, mode: "genius" }
 *
 * parseModeFlagValue(undefined);
 * // { valid: true, mode: "good" } (uses default)
 *
 * parseModeFlagValue("invalid");
 * // { valid: false, error: "Invalid mode: invalid. Valid modes: free, cheap, good, genius" }
 * ```
 */
export function parseModeFlagValue(value: string | undefined): ModeFlagResult {
  // Handle undefined - use default mode
  if (value === undefined) {
    return {
      valid: true,
      mode: DEFAULT_MODE,
    };
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Handle empty string
  if (trimmed === "") {
    return {
      valid: false,
      error: `Invalid mode: "${value}". Valid modes: ${VALID_MODES.join(", ")}`,
    };
  }

  // Validate mode
  if (!isValidModeFlag(trimmed)) {
    return {
      valid: false,
      error: `Invalid mode: "${trimmed}". Valid modes: ${VALID_MODES.join(", ")}`,
    };
  }

  return {
    valid: true,
    mode: trimmed,
  };
}

/**
 * Get the description for a mode
 *
 * @param mode - The mode to describe
 * @returns Human-readable description including savings percentage
 *
 * @example
 * ```typescript
 * getModeDescription("cheap");
 * // "Use low-cost models (saves ~60-70%)"
 * ```
 */
export function getModeDescription(mode: Mode): string {
  return MODE_DESCRIPTIONS[mode];
}

/**
 * Get help text for the --mode flag
 *
 * Generates formatted help text showing all modes with descriptions,
 * suitable for display in CLI help output.
 *
 * @returns Multi-line help text for --mode flag
 *
 * @example
 * ```typescript
 * console.log(getModeHelpText());
 * // Cost optimization mode:
 * //   free   - Use free tier models (saves 100%)
 * //   cheap  - Use low-cost models (saves ~60-70%)
 * //   good   - Use balanced models (default)
 * //   genius - Use SOTA models for all tasks
 * ```
 */
export function getModeHelpText(): string {
  const lines = ["Cost optimization mode:"];

  for (const mode of VALID_MODES) {
    const desc = MODE_DESCRIPTIONS[mode];
    const savingsLabel =
      mode !== "genius" ? ` - ${MODE_SAVINGS[mode]} savings` : "";

    lines.push(`  ${mode.padEnd(7)} - ${desc}${savingsLabel}`);
  }

  return lines.join("\n");
}

/**
 * Log mode selection to console
 *
 * @param mode - The selected mode
 * @param logger - Logger function (defaults to console.log)
 */
export function logModeSelection(
  mode: Mode,
  logger: (message: string) => void = console.log
): void {
  const desc = MODE_DESCRIPTIONS[mode];
  logger(`Mode: ${mode} - ${desc}`);
}
