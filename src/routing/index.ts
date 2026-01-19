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
