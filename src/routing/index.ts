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

// Re-export cascade types and functions
export {
  EscalationStepSchema,
  EscalationResultSchema,
  executeWithCascade,
  getNextModel,
  type EscalationStep,
  type EscalationResult,
  type TaskExecutor,
} from "./cascade";

// Re-export fallback types and functions
export {
  DEFAULT_COOLDOWN_MS,
  HarnessAvailabilitySchema,
  FallbackResultSchema,
  FallbackEventSchema,
  isRateLimitError,
  markHarnessRateLimited,
  isHarnessOnCooldown,
  getCooldownEnd,
  setCooldownEnd,
  resetCooldowns,
  setHarnessInstalled,
  resetTestInstallationState,
  getRequiredEnvVar,
  hasRequiredApiKey,
  hasFreeTierModel,
  getFreeModeHarnesses,
  formatUnavailableMessage,
  createFallbackEvent,
  getAvailableHarness,
  selectHarnessWithFallback,
  getModelForHarnessAndMode,
  type HarnessAvailability,
  type FallbackResult,
  type FallbackEvent,
} from "./fallback";

// Re-export estimate types and functions
export {
  ESCALATION_BUFFER_PERCENT,
  StoryEstimateSchema,
  FeatureCostEstimateSchema,
  ModeComparisonSchema,
  estimateStoryCost,
  estimateFeatureCost,
  formatCostEstimate,
  formatCostBreakdown,
  compareModes,
  formatModeComparison,
  type StoryEstimate,
  type FeatureCostEstimate,
  type ModeComparison,
} from "./estimate";

// Re-export report types and functions
export {
  EscalationEventSchema,
  StoryExecutionSchema,
  ModelUtilizationSchema,
  CostComparisonSchema,
  FeatureCostReportSchema,
  createStoryExecution,
  getBaselineCost,
  calculateModelUtilization,
  calculateEscalationOverhead,
  generateCostReport,
  formatStoryLine,
  formatEscalationLine,
  formatComparisonLine,
  formatUtilizationStats,
  formatCostReport,
  saveCostReport,
  loadHistoricalCosts,
  type EscalationEvent,
  type StoryExecution,
  type ModelUtilization,
  type CostComparison,
  type FeatureCostReport,
  type HistoricalCostEntry,
  type FileSystemInterface,
} from "./report";
