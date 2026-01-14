/**
 * Unit tests for Queue Lock Manager
 *
 * Tests file-based locking for queue operations.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestDir, wait } from "../helpers";

describe("Queue Lock Manager", () => {
  let tempDir: string;
  let cleanup: () => Promise<void>;
  let featurePath: string;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
    featurePath = await createTestDir(tempDir, "feature");
  });

  afterEach(async () => {
    // Reset lock timeout to default
    const { setLockTimeout } = await import("../../src/queue/lock");
    setLockTimeout(5000);
    await cleanup();
  });

  describe("acquireQueueLock", () => {
    it("returns true when no lock exists", async () => {
      const { acquireQueueLock, releaseQueueLock } = await import(
        "../../src/queue/lock"
      );

      const result = await acquireQueueLock(featurePath);
      expect(result).toBe(true);

      await releaseQueueLock(featurePath);
    });

    it("returns false when lock already exists and is valid", async () => {
      const { acquireQueueLock, releaseQueueLock } = await import(
        "../../src/queue/lock"
      );

      // Acquire first lock
      const result1 = await acquireQueueLock(featurePath);
      expect(result1).toBe(true);

      // Try to acquire second lock
      const result2 = await acquireQueueLock(featurePath);
      expect(result2).toBe(false);

      await releaseQueueLock(featurePath);
    });

    it("acquires lock if existing lock is stale", async () => {
      const { acquireQueueLock, releaseQueueLock, setLockTimeout } =
        await import("../../src/queue/lock");

      // Set short timeout for testing
      setLockTimeout(50);

      // Acquire lock
      await acquireQueueLock(featurePath);

      // Wait for lock to become stale
      await wait(60);

      // Should be able to acquire new lock
      const result = await acquireQueueLock(featurePath);
      expect(result).toBe(true);

      await releaseQueueLock(featurePath);
    });

    it("creates lock file with correct format", async () => {
      const { acquireQueueLock, releaseQueueLock } = await import(
        "../../src/queue/lock"
      );

      await acquireQueueLock(featurePath);

      const lockFile = Bun.file(`${featurePath}/.queue.lock`);
      expect(await lockFile.exists()).toBe(true);

      const content = await lockFile.text();
      const lockData = JSON.parse(content);

      expect(lockData).toHaveProperty("timestamp");
      expect(lockData).toHaveProperty("pid");
      expect(typeof lockData.timestamp).toBe("string");
      expect(typeof lockData.pid).toBe("number");

      await releaseQueueLock(featurePath);
    });
  });

  describe("releaseQueueLock", () => {
    it("removes lock file", async () => {
      const { existsSync } = await import("node:fs");
      const { acquireQueueLock, releaseQueueLock } = await import(
        "../../src/queue/lock"
      );

      const lockFilePath = `${featurePath}/.queue.lock`;

      await acquireQueueLock(featurePath);

      expect(existsSync(lockFilePath)).toBe(true);

      await releaseQueueLock(featurePath);

      expect(existsSync(lockFilePath)).toBe(false);
    });

    it("does not throw if lock file does not exist", async () => {
      const { releaseQueueLock } = await import("../../src/queue/lock");

      // Should not throw
      await releaseQueueLock(featurePath);
    });
  });

  describe("isQueueLocked", () => {
    it("returns false when no lock file exists", async () => {
      const { isQueueLocked } = await import("../../src/queue/lock");

      const result = await isQueueLocked(featurePath);
      expect(result).toBe(false);
    });

    it("returns true when valid lock exists", async () => {
      const { acquireQueueLock, isQueueLocked, releaseQueueLock } = await import(
        "../../src/queue/lock"
      );

      await acquireQueueLock(featurePath);

      const result = await isQueueLocked(featurePath);
      expect(result).toBe(true);

      await releaseQueueLock(featurePath);
    });

    it("returns false when lock is stale", async () => {
      const { acquireQueueLock, isQueueLocked, setLockTimeout } = await import(
        "../../src/queue/lock"
      );

      // Set short timeout
      setLockTimeout(50);

      await acquireQueueLock(featurePath);

      // Wait for lock to become stale
      await wait(60);

      const result = await isQueueLocked(featurePath);
      expect(result).toBe(false);
    });

    it("returns false for invalid lock file", async () => {
      const { isQueueLocked } = await import("../../src/queue/lock");

      // Create invalid lock file
      await Bun.write(`${featurePath}/.queue.lock`, "invalid json");

      const result = await isQueueLocked(featurePath);
      expect(result).toBe(false);
    });
  });

  describe("setLockTimeout and getLockTimeout", () => {
    it("setLockTimeout updates the timeout", async () => {
      const { setLockTimeout, getLockTimeout } = await import(
        "../../src/queue/lock"
      );

      setLockTimeout(1000);
      expect(getLockTimeout()).toBe(1000);

      setLockTimeout(2000);
      expect(getLockTimeout()).toBe(2000);
    });
  });

  describe("module exports", () => {
    it("exports all required functions", async () => {
      const lockModule = await import("../../src/queue/lock");

      expect(typeof lockModule.acquireQueueLock).toBe("function");
      expect(typeof lockModule.releaseQueueLock).toBe("function");
      expect(typeof lockModule.isQueueLocked).toBe("function");
      expect(typeof lockModule.setLockTimeout).toBe("function");
      expect(typeof lockModule.getLockTimeout).toBe("function");
    });
  });
});
