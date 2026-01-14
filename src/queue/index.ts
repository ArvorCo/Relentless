/**
 * Queue Module
 *
 * Provides queue management for mid-run user input.
 * Agents check the queue between iterations to receive
 * user guidance and structured commands.
 */

// Export types
export type {
  QueueItem,
  QueueState,
  QueueCommandType,
  QueueItemType,
  QueueProcessResult,
  ParsedCommand,
} from "./types";

export {
  QueueItemSchema,
  QueueStateSchema,
  QueueCommandTypeSchema,
  QueueItemTypeSchema,
} from "./types";

// Export parser functions
export { parseQueueLine, parseCommand, formatQueueLine } from "./parser";

// Export writer functions
export { addToQueue, removeFromQueue, clearQueue } from "./writer";

// Export loader functions
export { loadQueue } from "./loader";

// Export processor functions
export { processQueue } from "./processor";

// Export lock functions
export {
  acquireQueueLock,
  releaseQueueLock,
  isQueueLocked,
  setLockTimeout,
  getLockTimeout,
} from "./lock";
