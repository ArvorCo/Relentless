/**
 * Harness Fallback Chain Module
 *
 * Provides automatic harness fallback when the current harness is unavailable
 * due to rate limits, missing installation, or missing API keys.
 *
 * Key features:
 * - Checks harness availability (installed, API key present, not rate-limited)
 * - Manages cooldown state for rate-limited harnesses
 * - Supports free mode constraints (only harnesses with free models)
 * - Logs fallback events with reasons
 *
 * @module routing/fallback
 */

import { z } from "zod";
import type { HarnessName, AutoModeConfig, Mode, Complexity } from "../config/schema";
import { DEFAULT_CONFIG } from "../config/schema";
import { getModelById, getModelsByHarness } from "./registry";
import { MODE_MODEL_MATRIX } from "./router";

/**
 * Default cooldown period in milliseconds (60 seconds)
 */
export const DEFAULT_COOLDOWN_MS = 60000;

/**
 * In-memory cooldown state for rate-limited harnesses
 * Maps harness name to cooldown end time
 */
const cooldownState: Map<HarnessName, Date> = new Map();

/**
 * In-memory installation state for testing
 * Maps harness name to installation status
 * Only used when testing - real checks use agent registry
 */
const testInstallationState: Map<HarnessName, boolean> = new Map();

/**
 * Whether we're in test mode (using mock installation state)
 */
let testMode = false;

/**
 * Schema for harness availability result
 */
export const HarnessAvailabilitySchema = z.object({
  available: z.boolean(),
  harness: z.string().optional(),
  reason: z.string().optional(),
  cooldownUntil: z.date().optional(),
});

export type HarnessAvailability = z.infer<typeof HarnessAvailabilitySchema>;

/**
 * Schema for fallback result
 */
export const FallbackResultSchema = z.object({
  harness: z.string(),
  model: z.string(),
  fallbacksUsed: z.array(z.string()),
  allUnavailable: z.boolean(),
  reason: z.string().optional(),
});

export type FallbackResult = z.infer<typeof FallbackResultSchema>;

/**
 * Schema for fallback event (recorded in escalation steps)
 */
export const FallbackEventSchema = z.object({
  harness: z.string(),
  result: z.enum(["rate_limited", "unavailable", "no_api_key", "not_installed"]),
  error: z.string().optional(),
  nextHarness: z.string().optional(),
});

export type FallbackEvent = z.infer<typeof FallbackEventSchema>;

/**
 * Maps harness names to their required environment variables
 * Note: Some harnesses (opencode, droid, amp) use free models and don't require API keys
 */
const HARNESS_ENV_VARS: Partial<Record<HarnessName, string>> = {
  claude: "ANTHROPIC_API_KEY",
  codex: "OPENAI_API_KEY",
  droid: "FACTORY_API_KEY",
  gemini: "GOOGLE_API_KEY",
  // amp can work without API key in free mode
  // opencode uses free models, no API key required
};

/**
 * Harnesses that have free tier models available
 */
const FREE_TIER_HARNESSES: Set<HarnessName> = new Set([
  "opencode", // glm-4.7, grok-code-fast-1, minimax-m2.1
  // gemini requires API key and has paid tiers
]);

/**
 * Checks if an error message indicates a rate limit
 *
 * @param errorMessage - The error message to check
 * @returns true if the error indicates a rate limit
 */
export function isRateLimitError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase();

  return (
    lowerMessage.includes("429") ||
    lowerMessage.includes("rate limit") ||
    (lowerMessage.includes("quota") && lowerMessage.includes("exhausted")) ||
    lowerMessage.includes("too many requests")
  );
}

/**
 * Marks a harness as rate-limited and sets a cooldown period
 *
 * @param harness - The harness name to mark as rate-limited
 * @param cooldownMs - Cooldown period in milliseconds (default: 60 seconds)
 */
export function markHarnessRateLimited(
  harness: HarnessName,
  cooldownMs: number = DEFAULT_COOLDOWN_MS
): void {
  const cooldownEnd = new Date(Date.now() + cooldownMs);
  cooldownState.set(harness, cooldownEnd);
}

/**
 * Checks if a harness is currently on cooldown
 *
 * @param harness - The harness name to check
 * @returns true if the harness is on cooldown
 */
export function isHarnessOnCooldown(harness: HarnessName): boolean {
  const cooldownEnd = cooldownState.get(harness);
  if (!cooldownEnd) {
    return false;
  }

  // Check if cooldown has expired
  if (cooldownEnd <= new Date()) {
    cooldownState.delete(harness);
    return false;
  }

  return true;
}

/**
 * Gets the cooldown end time for a harness
 *
 * @param harness - The harness name
 * @returns The cooldown end time, or undefined if not on cooldown
 */
export function getCooldownEnd(harness: HarnessName): Date | undefined {
  return cooldownState.get(harness);
}

/**
 * Sets the cooldown end time for a harness (for testing)
 *
 * @param harness - The harness name
 * @param endTime - The cooldown end time
 */
export function setCooldownEnd(harness: HarnessName, endTime: Date): void {
  cooldownState.set(harness, endTime);
}

/**
 * Resets all cooldown state (for testing)
 */
export function resetCooldowns(): void {
  cooldownState.clear();
}

/**
 * Sets the installation state for a harness (for testing)
 *
 * @param harness - The harness name
 * @param installed - Whether the harness is installed
 */
export function setHarnessInstalled(harness: HarnessName, installed: boolean): void {
  testMode = true;
  testInstallationState.set(harness, installed);
}

/**
 * Resets test installation state
 */
export function resetTestInstallationState(): void {
  testInstallationState.clear();
  testMode = false;
}

/**
 * Gets the required environment variable for a harness
 *
 * @param harness - The harness name
 * @returns The required environment variable name, or undefined if none required
 */
export function getRequiredEnvVar(harness: HarnessName): string | undefined {
  return HARNESS_ENV_VARS[harness];
}

/**
 * Checks if the required API key is set for a harness
 *
 * @param harness - The harness name
 * @returns true if the API key is set or not required
 */
export function hasRequiredApiKey(harness: HarnessName): boolean {
  const envVar = getRequiredEnvVar(harness);
  if (!envVar) {
    return true; // No API key required
  }
  return !!process.env[envVar];
}

/**
 * Checks if a harness has free tier models available
 *
 * @param harness - The harness name
 * @returns true if the harness has free models
 */
export function hasFreeTierModel(harness: HarnessName): boolean {
  return FREE_TIER_HARNESSES.has(harness);
}

/**
 * Filters harnesses to only those with free tier models
 *
 * @param harnesses - Array of harness names
 * @returns Array of harnesses with free models
 */
export function getFreeModeHarnesses(harnesses: HarnessName[]): HarnessName[] {
  return harnesses.filter((h) => hasFreeTierModel(h));
}

/**
 * Formats an unavailability message for logging
 *
 * @param harness - The unavailable harness
 * @param reason - The reason for unavailability
 * @param nextHarness - The next harness to try
 * @returns Formatted log message
 */
export function formatUnavailableMessage(
  harness: HarnessName,
  reason: string,
  nextHarness?: HarnessName
): string {
  const next = nextHarness ? `, falling back to ${nextHarness}` : "";
  return `Harness ${harness} unavailable (${reason})${next}`;
}

/**
 * Creates a fallback event for recording
 *
 * @param harness - The harness that was unavailable
 * @param result - The type of unavailability
 * @param nextHarness - The next harness to try
 * @returns FallbackEvent object
 */
export function createFallbackEvent(
  harness: HarnessName,
  result: FallbackEvent["result"],
  nextHarness?: HarnessName
): FallbackEvent {
  return {
    harness,
    result,
    error: formatUnavailableMessage(harness, result, nextHarness),
    nextHarness,
  };
}

/**
 * Options for getAvailableHarness
 */
interface GetAvailableHarnessOptions {
  freeMode?: boolean;
  skipApiKeyCheck?: boolean;
}

/**
 * Checks if a harness is installed
 * Uses test state if in test mode, otherwise checks actual installation
 *
 * @param harness - The harness name
 * @returns Promise<boolean> whether the harness is installed
 */
async function isHarnessInstalled(harness: HarnessName): Promise<boolean> {
  if (testMode) {
    return testInstallationState.get(harness) ?? false;
  }

  // In production, use the agent registry
  try {
    const { getAgent } = await import("../agents/registry");
    const agent = getAgent(harness);
    if (!agent) {
      return false;
    }
    return await agent.isInstalled();
  } catch {
    return false;
  }
}

/**
 * Gets the first available harness from the fallback order
 *
 * @param fallbackOrder - Array of harness names in priority order
 * @param options - Options for filtering (freeMode, skipApiKeyCheck)
 * @returns HarnessAvailability with the first available harness or unavailable status
 */
export async function getAvailableHarness(
  fallbackOrder: HarnessName[],
  options: GetAvailableHarnessOptions = {}
): Promise<HarnessAvailability & { harness?: HarnessName }> {
  const { freeMode = false, skipApiKeyCheck = false } = options;

  // Filter to free harnesses if in free mode
  const harnesses = freeMode ? getFreeModeHarnesses(fallbackOrder) : fallbackOrder;

  const unavailableReasons: string[] = [];

  for (const harness of harnesses) {
    // Check if on cooldown (rate limited)
    if (isHarnessOnCooldown(harness)) {
      const cooldownEnd = getCooldownEnd(harness);
      unavailableReasons.push(`${harness}: rate_limited until ${cooldownEnd?.toISOString()}`);
      continue;
    }

    // Check if installed
    const installed = await isHarnessInstalled(harness);
    if (!installed) {
      unavailableReasons.push(`${harness}: not installed`);
      continue;
    }

    // Check API key (unless skipped or harness has free tier)
    if (!skipApiKeyCheck && !hasFreeTierModel(harness) && !hasRequiredApiKey(harness)) {
      unavailableReasons.push(`${harness}: missing API key (${getRequiredEnvVar(harness)})`);
      continue;
    }

    // Harness is available
    return {
      available: true,
      harness,
      reason:
        unavailableReasons.length > 0 ? unavailableReasons.join("; ") : undefined,
    };
  }

  // No harness available
  return {
    available: false,
    reason:
      unavailableReasons.length > 0
        ? `All harnesses unavailable: ${unavailableReasons.join("; ")}`
        : "No harnesses in fallback order",
  };
}

/**
 * Selects a harness considering fallback chain and all constraints
 *
 * @param config - AutoModeConfig with fallback order and settings
 * @param options - Options for selection
 * @returns FallbackResult with selected harness and model
 */
export async function selectHarnessWithFallback(
  config: AutoModeConfig,
  options: { mode?: Mode; complexity?: Complexity } = {}
): Promise<FallbackResult> {
  const { mode = config.defaultMode, complexity = "medium" } = options;
  const freeMode = mode === "free";

  const fallbacksUsed: string[] = [];
  const harnesses = freeMode
    ? getFreeModeHarnesses(config.fallbackOrder)
    : config.fallbackOrder;

  for (const harness of harnesses) {
    // Check availability
    const isOnCooldown = isHarnessOnCooldown(harness);
    const installed = await isHarnessInstalled(harness);
    const hasApiKey = hasFreeTierModel(harness) || hasRequiredApiKey(harness);

    if (isOnCooldown) {
      fallbacksUsed.push(harness);
      console.log(formatUnavailableMessage(harness, "rate_limited"));
      continue;
    }

    if (!installed) {
      fallbacksUsed.push(harness);
      console.log(formatUnavailableMessage(harness, "not_installed"));
      continue;
    }

    if (!hasApiKey) {
      fallbacksUsed.push(harness);
      console.log(formatUnavailableMessage(harness, "no_api_key"));
      continue;
    }

    // Harness available - get model
    const model = getModelForHarnessAndMode(harness, mode, complexity, config);

    return {
      harness,
      model,
      fallbacksUsed,
      allUnavailable: false,
    };
  }

  // All harnesses unavailable
  return {
    harness: harnesses[0] ?? "claude",
    model: "unknown",
    fallbacksUsed,
    allUnavailable: true,
    reason: `All harnesses unavailable: ${fallbacksUsed.join(", ")}`,
  };
}

/**
 * Gets the appropriate model for a harness, mode, and complexity combination
 *
 * @param harness - The harness name
 * @param mode - The cost optimization mode
 * @param complexity - The task complexity
 * @returns The model identifier
 */
export function getModelForHarnessAndMode(
  harness: HarnessName,
  mode: Mode,
  complexity: Complexity,
  config?: AutoModeConfig
): string {
  // Use MODE_MODEL_MATRIX to get the default routing
  const rule = MODE_MODEL_MATRIX[mode][complexity];

  if (config && hasCustomModeModels(config)) {
    const overrideModel = config.modeModels[complexity];
    const overrideProfile = getModelById(overrideModel);
    if (overrideProfile && overrideProfile.harness === harness) {
      if (mode !== "free" || overrideProfile.tier === "free") {
        return overrideModel;
      }
    }
  }

  // If the matrix specifies this harness, use its model
  if (rule.harness === harness) {
    return rule.model;
  }

  // Otherwise, select an appropriate model for the harness based on mode
  const models = getModelsByHarness(harness);
  if (models.length === 0) {
    return "unknown";
  }

  // For free mode, prefer free tier models
  if (mode === "free") {
    const freeModel = models.find((m) => m.tier === "free");
    if (freeModel) {
      return freeModel.id;
    }
  }

  // For cheap mode, prefer cheaper models
  if (mode === "cheap") {
    const cheapModel = models.find((m) => m.tier === "cheap" || m.tier === "standard");
    if (cheapModel) {
      return cheapModel.id;
    }
  }

  // For good/genius modes, prefer premium/sota models
  if (mode === "good" || mode === "genius") {
    const premiumModel = models.find((m) => m.tier === "sota" || m.tier === "premium");
    if (premiumModel) {
      return premiumModel.id;
    }
  }

  // Default to first available model
  return models[0].id;
}

function hasCustomModeModels(config: AutoModeConfig): boolean {
  const defaults = DEFAULT_CONFIG.autoMode.modeModels;
  return (
    config.modeModels.simple !== defaults.simple ||
    config.modeModels.medium !== defaults.medium ||
    config.modeModels.complex !== defaults.complex ||
    config.modeModels.expert !== defaults.expert
  );
}
