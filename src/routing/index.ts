/**
 * Routing Module
 *
 * Exports for smart model routing including model registry,
 * complexity classification, and routing logic.
 *
 * @module src/routing
 */

// Re-export registry types and functions
export {
  ModelTierSchema,
  ModelProfileSchema,
  HarnessProfileSchema,
  MODEL_REGISTRY,
  HARNESS_PROFILES,
  getModelById,
  getModelsByHarness,
  getModelsByTier,
  getDefaultModelForHarness,
  getHarnessForModel,
  type ModelTier,
  type ModelProfile,
  type HarnessProfile,
} from "./registry";

// Re-export classifier types and functions
export { classifyTask, type ClassificationResult } from "./classifier";

// Re-export router types and functions
export {
  MODE_MODEL_MATRIX,
  RoutingRuleSchema,
  RoutingDecisionSchema,
  routeTask,
  estimateTokens,
  calculateCost,
  type RoutingRule,
  type RoutingDecision,
} from "./router";
