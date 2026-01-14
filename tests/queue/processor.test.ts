/**
 * Queue Processor Tests
 *
 * Tests for the processQueue() function that processes pending queue items.
 * Tests are written BEFORE implementation (TDD - Red Phase).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import {
  createTempDir,
  createTestFile,
  readTestFile,
  fixtures,
} from "../helpers";

// Dynamic import to allow tests to be written before implementation
async function importProcessor() {
  return import("../../src/queue/processor");
}

describe("processQueue", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> };
  let featurePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    featurePath = tempDir.path;
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  describe("empty queue", () => {
    it("should return empty result when queue file does not exist", async () => {
      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual([]);
      expect(result.commands).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("should return empty result when queue file is empty", async () => {
      await createTestFile(featurePath, ".queue.txt", "");

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual([]);
      expect(result.commands).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe("processing prompts", () => {
    it("should extract text prompts from queue items", async () => {
      const line1 = fixtures.validQueueLine("Fix the authentication bug");
      const line2 = fixtures.validQueueLine("Add error handling");
      await createTestFile(featurePath, ".queue.txt", `${line1}\n${line2}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual([
        "Fix the authentication bug",
        "Add error handling",
      ]);
      expect(result.commands).toEqual([]);
    });

    it("should preserve prompt order (FIFO)", async () => {
      const line1 = fixtures.validQueueLine("First task");
      const line2 = fixtures.validQueueLine("Second task");
      const line3 = fixtures.validQueueLine("Third task");
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${line1}\n${line2}\n${line3}\n`
      );

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual(["First task", "Second task", "Third task"]);
    });
  });

  describe("processing commands", () => {
    it("should extract PAUSE command", async () => {
      const line = fixtures.validQueueLine("[PAUSE]");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.commands).toEqual([{ type: "PAUSE" }]);
      expect(result.prompts).toEqual([]);
    });

    it("should extract ABORT command", async () => {
      const line = fixtures.validQueueLine("[ABORT]");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.commands).toEqual([{ type: "ABORT" }]);
    });

    it("should extract SKIP command with story ID", async () => {
      const line = fixtures.validQueueLine("[SKIP US-003]");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.commands).toEqual([{ type: "SKIP", storyId: "US-003" }]);
    });

    it("should extract PRIORITY command with story ID", async () => {
      const line = fixtures.validQueueLine("[PRIORITY US-005]");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.commands).toEqual([{ type: "PRIORITY", storyId: "US-005" }]);
    });
  });

  describe("mixed prompts and commands", () => {
    it("should separate prompts from commands", async () => {
      const prompt1 = fixtures.validQueueLine("Focus on performance");
      const cmd1 = fixtures.validQueueLine("[PAUSE]");
      const prompt2 = fixtures.validQueueLine("Check the logs");
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${prompt1}\n${cmd1}\n${prompt2}\n`
      );

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual(["Focus on performance", "Check the logs"]);
      expect(result.commands).toEqual([{ type: "PAUSE" }]);
    });

    it("should handle multiple commands in correct order", async () => {
      const cmd1 = fixtures.validQueueLine("[SKIP US-001]");
      const cmd2 = fixtures.validQueueLine("[PRIORITY US-003]");
      const cmd3 = fixtures.validQueueLine("[PAUSE]");
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${cmd1}\n${cmd2}\n${cmd3}\n`
      );

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.commands).toEqual([
        { type: "SKIP", storyId: "US-001" },
        { type: "PRIORITY", storyId: "US-003" },
        { type: "PAUSE" },
      ]);
    });
  });

  describe("file operations", () => {
    it("should clear items from .queue.txt after processing", async () => {
      const line = fixtures.validQueueLine("Test message");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      await processQueue(featurePath);

      // Queue file should be empty after processing
      const queuePath = join(featurePath, ".queue.txt");
      const content = await readTestFile(queuePath);
      expect(content.trim()).toBe("");
    });

    it("should move items to .queue.processed.txt after processing", async () => {
      const line = fixtures.validQueueLine("Test message");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      await processQueue(featurePath);

      // Processed file should contain the item
      const processedPath = join(featurePath, ".queue.processed.txt");
      const content = await readTestFile(processedPath);
      expect(content).toContain("Test message");
    });

    it("should append to existing .queue.processed.txt", async () => {
      // Create existing processed file
      const existingLine = fixtures.validQueueLine("Old message");
      await createTestFile(
        featurePath,
        ".queue.processed.txt",
        `${existingLine}\n`
      );

      // Add new item to queue
      const newLine = fixtures.validQueueLine("New message");
      await createTestFile(featurePath, ".queue.txt", `${newLine}\n`);

      const { processQueue } = await importProcessor();
      await processQueue(featurePath);

      // Both messages should be in processed file
      const processedPath = join(featurePath, ".queue.processed.txt");
      const content = await readTestFile(processedPath);
      expect(content).toContain("Old message");
      expect(content).toContain("New message");
    });

    it("should add processedAt timestamp to moved items", async () => {
      const line = fixtures.validQueueLine("Test message");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const beforeTime = new Date().toISOString();
      const { processQueue } = await importProcessor();
      await processQueue(featurePath);
      const afterTime = new Date().toISOString();

      // Check that processed items have a processedAt timestamp
      const processedPath = join(featurePath, ".queue.processed.txt");
      const content = await readTestFile(processedPath);

      // The processed line should have a format that includes both timestamps
      // Original format: timestamp | content
      // Processed format: timestamp | content | processedAt:timestamp
      expect(content).toMatch(/processedAt:/);
    });
  });

  describe("warning handling", () => {
    it("should add warning for malformed lines", async () => {
      const validLine = fixtures.validQueueLine("Valid message");
      const malformedLine = "this is missing timestamp";
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${validLine}\n${malformedLine}\n`
      );

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual(["Valid message"]);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("malformed");
    });

    it("should skip empty lines without warnings", async () => {
      const line1 = fixtures.validQueueLine("Message 1");
      const line2 = fixtures.validQueueLine("Message 2");
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${line1}\n\n\n${line2}\n`
      );

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual(["Message 1", "Message 2"]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("should handle prompts with special characters", async () => {
      const line = fixtures.validQueueLine("Fix the | pipe | issue");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual(["Fix the | pipe | issue"]);
    });

    it("should handle case-insensitive commands", async () => {
      const line = fixtures.validQueueLine("[pause]");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.commands).toEqual([{ type: "PAUSE" }]);
    });

    it("should handle trailing whitespace in lines", async () => {
      const line = fixtures.validQueueLine("Message with spaces   ");
      await createTestFile(featurePath, ".queue.txt", `${line}   \n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts.length).toBe(1);
      // Content should be trimmed
      expect(result.prompts[0]).not.toMatch(/\s+$/);
    });

    it("should handle unicode content", async () => {
      const line = fixtures.validQueueLine("Fix the 日本語 issue 🎉");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();
      const result = await processQueue(featurePath);

      expect(result.prompts).toEqual(["Fix the 日本語 issue 🎉"]);
    });
  });

  describe("idempotency", () => {
    it("should return empty on second call (items already processed)", async () => {
      const line = fixtures.validQueueLine("Test message");
      await createTestFile(featurePath, ".queue.txt", `${line}\n`);

      const { processQueue } = await importProcessor();

      // First call processes the item
      const result1 = await processQueue(featurePath);
      expect(result1.prompts).toEqual(["Test message"]);

      // Second call should return empty (queue is cleared)
      const result2 = await processQueue(featurePath);
      expect(result2.prompts).toEqual([]);
      expect(result2.commands).toEqual([]);
    });
  });
});
