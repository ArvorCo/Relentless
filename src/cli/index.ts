/**
 * CLI Module
 *
 * Exports CLI-related utilities for command parsing and validation.
 *
 * @module src/cli
 */

// Export queue utilities
export {
  queueAdd,
  queueList,
  queueRemove,
  queueClear,
  formatQueueList,
  resolveFeaturePath,
  type QueueAddOptions,
  type QueueAddResult,
  type QueueListOptions,
  type QueueListResult,
  type QueueRemoveOptions,
  type QueueRemoveResult,
  type QueueClearOptions,
  type QueueClearResult,
  type ResolveFeaturePathResult,
} from "./queue";

// Export mode flag utilities
export {
  VALID_MODES,
  DEFAULT_MODE,
  isValidModeFlag,
  parseModeFlagValue,
  getModeDescription,
  getModeHelpText,
  logModeSelection,
  type ModeFlagOptions,
  type ModeFlagResult,
} from "./mode-flag";

// Export fallback order flag utilities
export {
  VALID_HARNESSES,
  DEFAULT_FALLBACK_ORDER,
  isValidHarnessName,
  parseFallbackOrderValue,
  getFallbackOrderHelpText,
  logFallbackOrderSelection,
  type FallbackOrderResult,
} from "./fallback-order";
