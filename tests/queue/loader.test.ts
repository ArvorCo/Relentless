/**
 * Queue Loader Tests
 *
 * Tests for queue loading functionality.
 * Following TDD: Tests written first, implementation comes after.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createTempDir,
  createTestFile,
  fixtures,
  mockTimestamp,
} from "../helpers";

describe("Queue Loader", () => {
  describe("loadQueue", () => {
    let loadQueue: typeof import("../../src/queue/loader").loadQueue;
    let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;

    beforeEach(async () => {
      const module = await import("../../src/queue/loader");
      loadQueue = module.loadQueue;
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      if (tempDir) {
        await tempDir.cleanup();
        tempDir = null;
      }
    });

    // Basic loading tests

    it("should return empty arrays when queue files do not exist", async () => {
      const state = await loadQueue(tempDir!.path);

      expect(state.pending).toEqual([]);
      expect(state.processed).toEqual([]);
      expect(state.featurePath).toBe(tempDir!.path);
    });

    it("should set lastChecked timestamp", async () => {
      const beforeCall = new Date().toISOString();
      const state = await loadQueue(tempDir!.path);
      const afterCall = new Date().toISOString();

      expect(state.lastChecked).toBeTruthy();
      expect(state.lastChecked! >= beforeCall).toBe(true);
      expect(state.lastChecked! <= afterCall).toBe(true);
    });

    // Pending items tests

    it("should load pending items from .queue.txt", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | Focus on error handling\n${timestamp} | [PAUSE]\n`;
      await createTestFile(tempDir!.path, ".queue.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(2);
      expect(state.pending[0].content).toBe("Focus on error handling");
      expect(state.pending[0].type).toBe("prompt");
      expect(state.pending[1].content).toBe("[PAUSE]");
      expect(state.pending[1].type).toBe("command");
      expect(state.pending[1].command).toBe("PAUSE");
    });

    it("should handle empty .queue.txt file", async () => {
      await createTestFile(tempDir!.path, ".queue.txt", "");

      const state = await loadQueue(tempDir!.path);

      expect(state.pending).toEqual([]);
    });

    it("should handle .queue.txt with only whitespace", async () => {
      await createTestFile(tempDir!.path, ".queue.txt", "   \n\n  \t  \n");

      const state = await loadQueue(tempDir!.path);

      expect(state.pending).toEqual([]);
    });

    // Processed items tests

    it("should load processed items from .queue.processed.txt", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | Previously processed prompt\n`;
      await createTestFile(tempDir!.path, ".queue.processed.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.processed.length).toBe(1);
      expect(state.processed[0].content).toBe("Previously processed prompt");
    });

    it("should load both pending and processed items", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      await createTestFile(tempDir!.path, ".queue.txt", `${timestamp} | Pending item\n`);
      await createTestFile(tempDir!.path, ".queue.processed.txt", `${timestamp} | Processed item\n`);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(1);
      expect(state.processed.length).toBe(1);
      expect(state.pending[0].content).toBe("Pending item");
      expect(state.processed[0].content).toBe("Processed item");
    });

    // Malformed content tests

    it("should skip malformed lines in .queue.txt", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | Valid line\nmalformed line without timestamp\n${timestamp} | Another valid line\n`;
      await createTestFile(tempDir!.path, ".queue.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(2);
      expect(state.pending[0].content).toBe("Valid line");
      expect(state.pending[1].content).toBe("Another valid line");
    });

    it("should skip malformed lines in .queue.processed.txt", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | Valid processed\nno timestamp here\n`;
      await createTestFile(tempDir!.path, ".queue.processed.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.processed.length).toBe(1);
      expect(state.processed[0].content).toBe("Valid processed");
    });

    it("should return warnings for skipped malformed lines", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | Valid line\nmalformed line\nanother bad line\n`;
      await createTestFile(tempDir!.path, ".queue.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(1);
      expect(state.warnings).toBeDefined();
      expect(state.warnings?.length).toBe(2);
      expect(state.warnings?.[0]).toContain("malformed line");
    });

    // Command parsing in loaded items

    it("should parse commands correctly when loading", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | [SKIP US-003]\n${timestamp} | [PRIORITY US-005]\n${timestamp} | [ABORT]\n`;
      await createTestFile(tempDir!.path, ".queue.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(3);
      expect(state.pending[0].command).toBe("SKIP");
      expect(state.pending[0].targetStoryId).toBe("US-003");
      expect(state.pending[1].command).toBe("PRIORITY");
      expect(state.pending[1].targetStoryId).toBe("US-005");
      expect(state.pending[2].command).toBe("ABORT");
    });

    // Edge cases

    it("should handle file with trailing newlines", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | Single item\n\n\n`;
      await createTestFile(tempDir!.path, ".queue.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(1);
    });

    it("should preserve order of items from file", async () => {
      const timestamp1 = "2026-01-13T10:30:00.000Z";
      const timestamp2 = "2026-01-13T10:31:00.000Z";
      const timestamp3 = "2026-01-13T10:32:00.000Z";
      const content = `${timestamp1} | First\n${timestamp2} | Second\n${timestamp3} | Third\n`;
      await createTestFile(tempDir!.path, ".queue.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(3);
      expect(state.pending[0].content).toBe("First");
      expect(state.pending[1].content).toBe("Second");
      expect(state.pending[2].content).toBe("Third");
    });

    it("should handle content with special characters", async () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = `${timestamp} | Use regex (a | b | c) for matching\n${timestamp} | Line with "quotes" and 'apostrophes'\n`;
      await createTestFile(tempDir!.path, ".queue.txt", content);

      const state = await loadQueue(tempDir!.path);

      expect(state.pending.length).toBe(2);
      expect(state.pending[0].content).toBe("Use regex (a | b | c) for matching");
      expect(state.pending[1].content).toBe("Line with \"quotes\" and 'apostrophes'");
    });
  });
});
