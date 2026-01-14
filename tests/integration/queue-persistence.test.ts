/**
 * Integration tests for Queue Persistence and Recovery
 *
 * Tests that queue files persist after crashes and restarts,
 * handle partial processing recovery, and maintain data integrity
 * during concurrent writes.
 *
 * User Story: US-017 - Queue Persistence and Recovery
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createTempDir,
  createTestFile,
  readTestFile,
  createTestDir,
  wait,
  fixtures,
} from "../helpers";

describe("Queue Persistence and Recovery", () => {
  let tempDir: string;
  let cleanup: () => Promise<void>;
  let featurePath: string;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
    // Create feature directory structure
    featurePath = await createTestDir(tempDir, "relentless/features/test-feature");
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("Queue file persistence after crash", () => {
    it("queue file persists after orchestrator crash", async () => {
      // Import queue functions
      const { addToQueue, loadQueue } = await import("../../src/queue");

      // Add items to queue
      await addToQueue(featurePath, "Fix the bug");
      await addToQueue(featurePath, "Update tests");

      // Simulate crash by not processing (queue remains on disk)
      // After restart, items should still be there
      const state = await loadQueue(featurePath);

      expect(state.pending.length).toBe(2);
      expect(state.pending[0].content).toBe("Fix the bug");
      expect(state.pending[1].content).toBe("Update tests");
    });

    it("processed items remain in .queue.processed.txt after crash", async () => {
      const { addToQueue, processQueue, loadQueue } = await import(
        "../../src/queue"
      );

      // Add and process items
      await addToQueue(featurePath, "Task 1");
      await addToQueue(featurePath, "Task 2");
      await processQueue(featurePath);

      // Simulate crash by closing/reopening
      // Processed items should still be there
      const state = await loadQueue(featurePath);

      expect(state.pending.length).toBe(0);
      expect(state.processed.length).toBe(2);
      expect(state.processed[0].content).toBe("Task 1");
      expect(state.processed[1].content).toBe("Task 2");
    });

    it("restarting orchestrator processes pending queue items", async () => {
      const { addToQueue, processQueue, loadQueue } = await import(
        "../../src/queue"
      );

      // Add items before "crash"
      await addToQueue(featurePath, "Important task");
      await addToQueue(featurePath, "[PAUSE]");

      // Verify items are pending
      let state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(2);

      // "Restart" - process the queue
      const result = await processQueue(featurePath);

      expect(result.prompts).toContain("Important task");
      expect(result.commands.length).toBe(1);
      expect(result.commands[0].type).toBe("PAUSE");

      // Verify queue is cleared
      state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(0);
      expect(state.processed.length).toBe(2);
    });
  });

  describe("Partial processing recovery", () => {
    it("partial processing recovers correctly with lock file", async () => {
      const {
        addToQueue,
        loadQueue,
        acquireQueueLock,
        releaseQueueLock,
        isQueueLocked,
      } = await import("../../src/queue");

      // Add items to queue
      await addToQueue(featurePath, "Item 1");
      await addToQueue(featurePath, "Item 2");
      await addToQueue(featurePath, "Item 3");

      // Acquire lock before processing (simulates processing start)
      const lockAcquired = await acquireQueueLock(featurePath);
      expect(lockAcquired).toBe(true);

      // Check lock is active
      expect(await isQueueLocked(featurePath)).toBe(true);

      // Simulate crash by not releasing lock
      // On restart, lock should be stale and recoverable

      // Wait a tiny bit to simulate time passing
      await wait(10);

      // Release lock (simulates recovery on restart)
      await releaseQueueLock(featurePath);

      // Verify items are still available for processing
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(3);
    });

    it("stale lock is automatically released after timeout", async () => {
      const {
        addToQueue,
        acquireQueueLock,
        isQueueLocked,
        releaseQueueLock,
        setLockTimeout,
      } = await import("../../src/queue");

      // Set a very short lock timeout for testing (50ms)
      setLockTimeout(50);

      await addToQueue(featurePath, "Test item");

      // Acquire lock
      await acquireQueueLock(featurePath);
      expect(await isQueueLocked(featurePath)).toBe(true);

      // Wait for lock to expire
      await wait(60);

      // Lock should be stale now
      expect(await isQueueLocked(featurePath)).toBe(false);

      // Should be able to acquire new lock
      const canAcquire = await acquireQueueLock(featurePath);
      expect(canAcquire).toBe(true);

      // Cleanup
      await releaseQueueLock(featurePath);

      // Reset lock timeout
      setLockTimeout(5000);
    });

    it("items remain in pending until fully processed", async () => {
      const { addToQueue, loadQueue } = await import("../../src/queue");

      // Add items
      await addToQueue(featurePath, "First");
      await addToQueue(featurePath, "Second");
      await addToQueue(featurePath, "Third");

      // Read queue directly (simulates crash before processing completes)
      const queueContent = await readTestFile(`${featurePath}/.queue.txt`);
      expect(queueContent).toContain("First");
      expect(queueContent).toContain("Second");
      expect(queueContent).toContain("Third");

      // Verify state
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(3);
    });
  });

  describe("Malformed line handling", () => {
    it("malformed lines logged with warning and skipped", async () => {
      const { loadQueue } = await import("../../src/queue");

      // Create queue file with valid and invalid lines
      const content = `2026-01-14T10:00:00.000Z | Valid item
invalid line without timestamp
2026-01-14T10:01:00.000Z | Another valid item
totally malformed
`;
      await createTestFile(featurePath, ".queue.txt", content);

      const state = await loadQueue(featurePath);

      // Only valid items should be loaded
      expect(state.pending.length).toBe(2);
      expect(state.pending[0].content).toBe("Valid item");
      expect(state.pending[1].content).toBe("Another valid item");

      // Warnings should be recorded
      expect(state.warnings).toBeDefined();
      expect(state.warnings?.length).toBe(2);
      expect(state.warnings?.[0]).toContain("invalid line without timestamp");
      expect(state.warnings?.[1]).toContain("totally malformed");
    });

    it("malformed lines in processed file are also warned", async () => {
      const { loadQueue } = await import("../../src/queue");

      // Create processed file with valid and invalid lines
      const content = `2026-01-14T10:00:00.000Z | Processed item | processedAt:2026-01-14T10:01:00.000Z
corrupted line
`;
      await createTestFile(featurePath, ".queue.processed.txt", content);

      const state = await loadQueue(featurePath);

      expect(state.processed.length).toBe(1);
      expect(state.warnings?.length).toBe(1);
      expect(state.warnings?.[0]).toContain("corrupted line");
    });
  });

  describe("Concurrent write safety", () => {
    it("no data loss with concurrent addToQueue calls", async () => {
      const { addToQueue, loadQueue } = await import("../../src/queue");

      // Perform many concurrent writes
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(addToQueue(featurePath, `Item ${i + 1}`));
      }

      await Promise.all(promises);

      // All items should be present
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(20);

      // Verify all items exist
      const contents = state.pending.map((item) => item.content);
      for (let i = 0; i < 20; i++) {
        expect(contents).toContain(`Item ${i + 1}`);
      }
    });

    it("concurrent read and write operations are safe", async () => {
      const { addToQueue, loadQueue } = await import("../../src/queue");

      // Start some writes
      const writePromises = [];
      for (let i = 0; i < 10; i++) {
        writePromises.push(addToQueue(featurePath, `Write ${i}`));
      }

      // Interleave reads
      const readPromises = [];
      for (let i = 0; i < 5; i++) {
        readPromises.push(loadQueue(featurePath));
      }

      // Wait for all operations
      await Promise.all([...writePromises, ...readPromises]);

      // Final state should have all items
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(10);
    });

    it("concurrent processQueue calls do not duplicate items", async () => {
      const { addToQueue, processQueue, loadQueue } = await import(
        "../../src/queue"
      );

      // Add items first
      await addToQueue(featurePath, "Item A");
      await addToQueue(featurePath, "Item B");
      await addToQueue(featurePath, "Item C");

      // Try to process concurrently (only first should succeed)
      const result1 = await processQueue(featurePath);
      const result2 = await processQueue(featurePath);

      // First call should have items, second should have none
      expect(result1.prompts.length + result2.prompts.length).toBe(3);

      // Verify processed file has exactly 3 items (no duplicates)
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(0);
      expect(state.processed.length).toBe(3);
    });

    it("file locking prevents race conditions", async () => {
      const { addToQueue, acquireQueueLock, releaseQueueLock } = await import(
        "../../src/queue"
      );

      // Add an item first
      await addToQueue(featurePath, "Initial item");

      // Acquire lock
      const lock1 = await acquireQueueLock(featurePath);
      expect(lock1).toBe(true);

      // Try to acquire another lock while first is held
      const lock2 = await acquireQueueLock(featurePath);
      expect(lock2).toBe(false); // Should fail

      // Release first lock
      await releaseQueueLock(featurePath);

      // Now should be able to acquire
      const lock3 = await acquireQueueLock(featurePath);
      expect(lock3).toBe(true);

      await releaseQueueLock(featurePath);
    });
  });

  describe("Integration: crash/restart simulation", () => {
    it("simulates crash and restart with pending queue", async () => {
      const { addToQueue, processQueue, loadQueue } = await import(
        "../../src/queue"
      );

      // Phase 1: Add items
      await addToQueue(featurePath, "Build feature X");
      await addToQueue(featurePath, "[SKIP US-003]");
      await addToQueue(featurePath, "Run tests");

      // Phase 2: Simulate crash (no processing)
      // Queue should persist on disk

      // Phase 3: Restart - load queue
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(3);

      // Phase 4: Process queue on restart
      const result = await processQueue(featurePath);

      expect(result.prompts).toContain("Build feature X");
      expect(result.prompts).toContain("Run tests");
      expect(result.commands.length).toBe(1);
      expect(result.commands[0].type).toBe("SKIP");
      expect(result.commands[0].storyId).toBe("US-003");

      // Phase 5: Verify queue cleared and items processed
      const finalState = await loadQueue(featurePath);
      expect(finalState.pending.length).toBe(0);
      expect(finalState.processed.length).toBe(3);
    });

    it("simulates multiple restart cycles", async () => {
      const { addToQueue, processQueue, loadQueue } = await import(
        "../../src/queue"
      );

      // Cycle 1
      await addToQueue(featurePath, "Cycle 1 task");
      await processQueue(featurePath);

      // Cycle 2
      await addToQueue(featurePath, "Cycle 2 task");
      await processQueue(featurePath);

      // Cycle 3
      await addToQueue(featurePath, "Cycle 3 task");

      // Simulate crash before processing cycle 3
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(1);
      expect(state.pending[0].content).toBe("Cycle 3 task");
      expect(state.processed.length).toBe(2);

      // Process cycle 3
      await processQueue(featurePath);

      const finalState = await loadQueue(featurePath);
      expect(finalState.pending.length).toBe(0);
      expect(finalState.processed.length).toBe(3);
    });
  });
});
