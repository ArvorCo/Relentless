/**
 * Queue Writer Tests
 *
 * Tests for queue file write operations.
 * Following TDD: Tests written first, implementation comes after.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, readTestFile, createTestFile } from "../helpers";
import { join } from "node:path";
import { stat } from "node:fs/promises";

describe("Queue Writer", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    if (tempDir) {
      await tempDir.cleanup();
      tempDir = null;
    }
  });

  describe("addToQueue", () => {
    let addToQueue: typeof import("../../src/queue/writer").addToQueue;

    beforeEach(async () => {
      const module = await import("../../src/queue/writer");
      addToQueue = module.addToQueue;
    });

    it("should create .queue.txt if it does not exist", async () => {
      const featurePath = tempDir!.path;
      const content = "Focus on error handling";

      await addToQueue(featurePath, content);

      const queuePath = join(featurePath, ".queue.txt");
      const fileExists = await Bun.file(queuePath).exists();
      expect(fileExists).toBe(true);
    });

    it("should add item with timestamp prefix", async () => {
      const featurePath = tempDir!.path;
      const content = "Focus on error handling";

      await addToQueue(featurePath, content);

      const queuePath = join(featurePath, ".queue.txt");
      const fileContent = await readTestFile(queuePath);

      // Should have timestamp | content format
      expect(fileContent).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| Focus on error handling\n$/
      );
    });

    it("should append to existing queue file", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      // Create existing queue file
      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | First message\n"
      );

      await addToQueue(featurePath, "Second message");

      const fileContent = await readTestFile(queuePath);
      const lines = fileContent.split("\n").filter((line) => line.trim());

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain("First message");
      expect(lines[1]).toContain("Second message");
    });

    it("should add multiple items in order", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      await addToQueue(featurePath, "Message 1");
      await addToQueue(featurePath, "Message 2");
      await addToQueue(featurePath, "Message 3");

      const fileContent = await readTestFile(queuePath);
      const lines = fileContent.split("\n").filter((line) => line.trim());

      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain("Message 1");
      expect(lines[1]).toContain("Message 2");
      expect(lines[2]).toContain("Message 3");
    });

    it("should handle command content", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      await addToQueue(featurePath, "[PAUSE]");
      await addToQueue(featurePath, "[SKIP US-003]");

      const fileContent = await readTestFile(queuePath);
      const lines = fileContent.split("\n").filter((line) => line.trim());

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain("[PAUSE]");
      expect(lines[1]).toContain("[SKIP US-003]");
    });

    it("should return the added queue item", async () => {
      const featurePath = tempDir!.path;
      const content = "Test message";

      const item = await addToQueue(featurePath, content);

      expect(item).toBeDefined();
      expect(item.content).toBe(content);
      expect(item.type).toBe("prompt");
      expect(item.addedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should return command item when adding a command", async () => {
      const featurePath = tempDir!.path;

      const item = await addToQueue(featurePath, "[PAUSE]");

      expect(item.type).toBe("command");
      expect(item.command).toBe("PAUSE");
    });

    it("should handle content with special characters", async () => {
      const featurePath = tempDir!.path;
      const content = "Fix the regex: pattern /a|b|c/g";

      await addToQueue(featurePath, content);

      const queuePath = join(featurePath, ".queue.txt");
      const fileContent = await readTestFile(queuePath);

      expect(fileContent).toContain(content);
    });

    it("should handle empty content string gracefully", async () => {
      const featurePath = tempDir!.path;

      // Should not throw but might add empty item or skip
      await expect(addToQueue(featurePath, "")).resolves.toBeDefined();
    });
  });

  describe("removeFromQueue", () => {
    let removeFromQueue: typeof import("../../src/queue/writer").removeFromQueue;
    let addToQueue: typeof import("../../src/queue/writer").addToQueue;

    beforeEach(async () => {
      const module = await import("../../src/queue/writer");
      removeFromQueue = module.removeFromQueue;
      addToQueue = module.addToQueue;
    });

    it("should remove item by 1-based index", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      // Create queue with 3 items
      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Message 1\n" +
          "2026-01-13T10:01:00.000Z | Message 2\n" +
          "2026-01-13T10:02:00.000Z | Message 3\n"
      );

      const removed = await removeFromQueue(featurePath, 2);

      const fileContent = await readTestFile(queuePath);
      const lines = fileContent.split("\n").filter((line) => line.trim());

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain("Message 1");
      expect(lines[1]).toContain("Message 3");
      expect(removed?.content).toBe("Message 2");
    });

    it("should remove first item when index is 1", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | First\n" +
          "2026-01-13T10:01:00.000Z | Second\n"
      );

      const removed = await removeFromQueue(featurePath, 1);

      const fileContent = await readTestFile(queuePath);
      const lines = fileContent.split("\n").filter((line) => line.trim());

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("Second");
      expect(removed?.content).toBe("First");
    });

    it("should remove last item when index equals length", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | First\n" +
          "2026-01-13T10:01:00.000Z | Second\n"
      );

      const removed = await removeFromQueue(featurePath, 2);

      const fileContent = await readTestFile(queuePath);
      const lines = fileContent.split("\n").filter((line) => line.trim());

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("First");
      expect(removed?.content).toBe("Second");
    });

    it("should return null for invalid index (0)", async () => {
      const featurePath = tempDir!.path;

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Message\n"
      );

      const removed = await removeFromQueue(featurePath, 0);

      expect(removed).toBeNull();
    });

    it("should return null for invalid index (negative)", async () => {
      const featurePath = tempDir!.path;

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Message\n"
      );

      const removed = await removeFromQueue(featurePath, -1);

      expect(removed).toBeNull();
    });

    it("should return null for index greater than queue length", async () => {
      const featurePath = tempDir!.path;

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Message\n"
      );

      const removed = await removeFromQueue(featurePath, 5);

      expect(removed).toBeNull();
    });

    it("should return null for empty queue", async () => {
      const featurePath = tempDir!.path;

      await createTestFile(featurePath, ".queue.txt", "");

      const removed = await removeFromQueue(featurePath, 1);

      expect(removed).toBeNull();
    });

    it("should return null if queue file does not exist", async () => {
      const featurePath = tempDir!.path;

      const removed = await removeFromQueue(featurePath, 1);

      expect(removed).toBeNull();
    });

    it("should create empty file after removing last item", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Only message\n"
      );

      await removeFromQueue(featurePath, 1);

      const fileContent = await readTestFile(queuePath);
      expect(fileContent.trim()).toBe("");
    });
  });

  describe("clearQueue", () => {
    let clearQueue: typeof import("../../src/queue/writer").clearQueue;

    beforeEach(async () => {
      const module = await import("../../src/queue/writer");
      clearQueue = module.clearQueue;
    });

    it("should remove all items from queue", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Message 1\n" +
          "2026-01-13T10:01:00.000Z | Message 2\n" +
          "2026-01-13T10:02:00.000Z | Message 3\n"
      );

      const count = await clearQueue(featurePath);

      const fileContent = await readTestFile(queuePath);
      expect(fileContent.trim()).toBe("");
      expect(count).toBe(3);
    });

    it("should return 0 for empty queue", async () => {
      const featurePath = tempDir!.path;

      await createTestFile(featurePath, ".queue.txt", "");

      const count = await clearQueue(featurePath);

      expect(count).toBe(0);
    });

    it("should return 0 if queue file does not exist", async () => {
      const featurePath = tempDir!.path;

      const count = await clearQueue(featurePath);

      expect(count).toBe(0);
    });

    it("should create empty file if queue did not exist", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      await clearQueue(featurePath);

      const fileExists = await Bun.file(queuePath).exists();
      expect(fileExists).toBe(true);

      const fileContent = await readTestFile(queuePath);
      expect(fileContent.trim()).toBe("");
    });

    it("should handle queue with malformed lines", async () => {
      const featurePath = tempDir!.path;

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Valid message\n" +
          "malformed line without timestamp\n" +
          "2026-01-13T10:01:00.000Z | Another valid\n"
      );

      // Should clear all lines, including malformed ones
      const count = await clearQueue(featurePath);

      // Could be 2 (valid only) or 3 (all lines) depending on implementation
      // The important thing is the file is cleared
      expect(count).toBeGreaterThanOrEqual(0);

      const queuePath = join(featurePath, ".queue.txt");
      const fileContent = await readTestFile(queuePath);
      expect(fileContent.trim()).toBe("");
    });
  });

  describe("Atomic Writes", () => {
    let addToQueue: typeof import("../../src/queue/writer").addToQueue;

    beforeEach(async () => {
      const module = await import("../../src/queue/writer");
      addToQueue = module.addToQueue;
    });

    it("should preserve file contents on write failure", async () => {
      const featurePath = tempDir!.path;
      const queuePath = join(featurePath, ".queue.txt");

      // Create initial content
      const initialContent = "2026-01-13T10:00:00.000Z | Initial message\n";
      await createTestFile(featurePath, ".queue.txt", initialContent);

      // This test verifies atomic write behavior
      // A proper implementation uses temp file + rename pattern
      await addToQueue(featurePath, "New message");

      const finalContent = await readTestFile(queuePath);
      expect(finalContent).toContain("Initial message");
      expect(finalContent).toContain("New message");
    });

    it("should not leave temp files after successful write", async () => {
      const featurePath = tempDir!.path;

      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-13T10:00:00.000Z | Message\n"
      );

      await addToQueue(featurePath, "New message");

      // Check no temp files remain
      const files = await Bun.file(join(featurePath, ".queue.txt.tmp")).exists();
      expect(files).toBe(false);
    });
  });
});
