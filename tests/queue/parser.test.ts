/**
 * Queue Parser Tests
 *
 * Tests for queue parsing functionality.
 * Following TDD: Tests written first, implementation comes after.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createTempDir,
  createTestFile,
  readTestFile,
  fixtures,
  mockTimestamp,
} from "../helpers";

// Test infrastructure tests (from US-001)
describe("Test Infrastructure", () => {
  describe("Test Helpers", () => {
    let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;

    afterEach(async () => {
      if (tempDir) {
        await tempDir.cleanup();
        tempDir = null;
      }
    });

    it("should create and cleanup temp directories", async () => {
      tempDir = await createTempDir();

      expect(tempDir.path).toBeTruthy();
      expect(tempDir.path).toContain("relentless-test-");

      // Verify directory exists
      const testPath = `${tempDir.path}/test.txt`;
      await Bun.write(testPath, "test content");
      const testFile = Bun.file(testPath);
      expect(await testFile.exists()).toBe(true);
    });

    it("should create and read test files", async () => {
      tempDir = await createTempDir();
      const content = "test content\nline 2";

      const filePath = await createTestFile(tempDir.path, "test.txt", content);
      const readContent = await readTestFile(filePath);

      expect(readContent).toBe(content);
    });

    it("should generate mock timestamps in ISO format", () => {
      const timestamp = mockTimestamp();
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should generate valid queue line fixtures", () => {
      const content = "Please fix the bug in auth module";
      const queueLine = fixtures.validQueueLine(content);

      expect(queueLine).toContain(" | ");
      expect(queueLine).toContain(content);
      expect(queueLine).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should generate queue command fixtures", () => {
      expect(fixtures.queueCommand("PAUSE")).toBe("[PAUSE]");
      expect(fixtures.queueCommand("SKIP", "US-003")).toBe("[SKIP US-003]");
      expect(fixtures.queueCommand("PRIORITY", "US-001")).toBe(
        "[PRIORITY US-001]"
      );
    });
  });
});

// Queue Parser Tests (US-002)
describe("Queue Parser", () => {
  // Import will be added after implementation
  // import { parseQueueLine, parseCommand, formatQueueLine } from "../../src/queue/parser";

  describe("parseQueueLine", () => {
    // Dynamic import to handle module not existing yet
    let parseQueueLine: typeof import("../../src/queue/parser").parseQueueLine;

    beforeEach(async () => {
      const module = await import("../../src/queue/parser");
      parseQueueLine = module.parseQueueLine;
    });

    it("should parse a valid prompt line correctly", () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = "Focus on error handling";
      const line = `${timestamp} | ${content}`;

      const item = parseQueueLine(line);

      expect(item).not.toBeNull();
      expect(item!.type).toBe("prompt");
      expect(item!.content).toBe(content);
      expect(item!.addedAt).toBe(timestamp);
      expect(item!.command).toBeUndefined();
    });

    it("should parse a PAUSE command line correctly", () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const line = `${timestamp} | [PAUSE]`;

      const item = parseQueueLine(line);

      expect(item).not.toBeNull();
      expect(item!.type).toBe("command");
      expect(item!.command).toBe("PAUSE");
      expect(item!.content).toBe("[PAUSE]");
    });

    it("should parse a SKIP command with story ID", () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const line = `${timestamp} | [SKIP US-003]`;

      const item = parseQueueLine(line);

      expect(item).not.toBeNull();
      expect(item!.type).toBe("command");
      expect(item!.command).toBe("SKIP");
      expect(item!.targetStoryId).toBe("US-003");
    });

    it("should parse a PRIORITY command with story ID", () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const line = `${timestamp} | [PRIORITY US-005]`;

      const item = parseQueueLine(line);

      expect(item).not.toBeNull();
      expect(item!.type).toBe("command");
      expect(item!.command).toBe("PRIORITY");
      expect(item!.targetStoryId).toBe("US-005");
    });

    it("should parse an ABORT command", () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const line = `${timestamp} | [ABORT]`;

      const item = parseQueueLine(line);

      expect(item).not.toBeNull();
      expect(item!.type).toBe("command");
      expect(item!.command).toBe("ABORT");
    });

    it("should return null for malformed line without timestamp", () => {
      const line = "Just a message without timestamp";
      const item = parseQueueLine(line);
      expect(item).toBeNull();
    });

    it("should return null for malformed line without separator", () => {
      const line = "2026-01-13T10:30:00.000Z no separator here";
      const item = parseQueueLine(line);
      expect(item).toBeNull();
    });

    it("should return null for empty line", () => {
      const item = parseQueueLine("");
      expect(item).toBeNull();
    });

    it("should return null for whitespace-only line", () => {
      const item = parseQueueLine("   \t  ");
      expect(item).toBeNull();
    });

    it("should handle content with multiple pipe characters", () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const content = "Use OR condition (a | b) in regex";
      const line = `${timestamp} | ${content}`;

      const item = parseQueueLine(line);

      expect(item).not.toBeNull();
      expect(item!.content).toBe(content);
    });

    it("should generate unique ID based on timestamp", () => {
      const timestamp = "2026-01-13T10:30:00.000Z";
      const line = `${timestamp} | Test message`;

      const item = parseQueueLine(line);

      expect(item).not.toBeNull();
      expect(item!.id).toBeTruthy();
      expect(item!.id).toContain(timestamp.replace(/[:.]/g, "-"));
    });
  });

  describe("parseCommand", () => {
    let parseCommand: typeof import("../../src/queue/parser").parseCommand;

    beforeEach(async () => {
      const module = await import("../../src/queue/parser");
      parseCommand = module.parseCommand;
    });

    it("should parse PAUSE command", () => {
      const cmd = parseCommand("[PAUSE]");
      expect(cmd).toEqual({ type: "PAUSE" });
    });

    it("should parse ABORT command", () => {
      const cmd = parseCommand("[ABORT]");
      expect(cmd).toEqual({ type: "ABORT" });
    });

    it("should parse SKIP with story ID", () => {
      const cmd = parseCommand("[SKIP US-003]");
      expect(cmd).toEqual({ type: "SKIP", storyId: "US-003" });
    });

    it("should parse PRIORITY with story ID", () => {
      const cmd = parseCommand("[PRIORITY US-001]");
      expect(cmd).toEqual({ type: "PRIORITY", storyId: "US-001" });
    });

    it("should be case insensitive for command names", () => {
      expect(parseCommand("[pause]")).toEqual({ type: "PAUSE" });
      expect(parseCommand("[Pause]")).toEqual({ type: "PAUSE" });
      expect(parseCommand("[PAUSE]")).toEqual({ type: "PAUSE" });
      expect(parseCommand("[skip us-003]")).toEqual({
        type: "SKIP",
        storyId: "US-003",
      });
    });

    it("should preserve case for story IDs", () => {
      const cmd = parseCommand("[skip us-003]");
      expect(cmd?.storyId).toBe("US-003");
    });

    it("should return null for non-command text", () => {
      expect(parseCommand("Just a regular message")).toBeNull();
      expect(parseCommand("No brackets here")).toBeNull();
    });

    it("should return null for incomplete brackets", () => {
      expect(parseCommand("[PAUSE")).toBeNull();
      expect(parseCommand("PAUSE]")).toBeNull();
    });

    it("should return null for unknown commands", () => {
      expect(parseCommand("[UNKNOWN]")).toBeNull();
      expect(parseCommand("[INVALID CMD]")).toBeNull();
    });

    it("should handle extra whitespace inside brackets", () => {
      expect(parseCommand("[ PAUSE ]")).toEqual({ type: "PAUSE" });
      expect(parseCommand("[  SKIP  US-003  ]")).toEqual({
        type: "SKIP",
        storyId: "US-003",
      });
    });

    it("should require story ID for SKIP command", () => {
      // SKIP without story ID should be treated as invalid
      expect(parseCommand("[SKIP]")).toBeNull();
    });

    it("should require story ID for PRIORITY command", () => {
      // PRIORITY without story ID should be treated as invalid
      expect(parseCommand("[PRIORITY]")).toBeNull();
    });
  });

  describe("formatQueueLine", () => {
    let formatQueueLine: typeof import("../../src/queue/parser").formatQueueLine;
    let parseQueueLine: typeof import("../../src/queue/parser").parseQueueLine;

    beforeEach(async () => {
      const module = await import("../../src/queue/parser");
      formatQueueLine = module.formatQueueLine;
      parseQueueLine = module.parseQueueLine;
    });

    it("should format a prompt item correctly", () => {
      const item = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "Focus on error handling",
        type: "prompt" as const,
        addedAt: "2026-01-13T10:30:00.000Z",
      };

      const line = formatQueueLine(item);

      expect(line).toBe("2026-01-13T10:30:00.000Z | Focus on error handling");
    });

    it("should format a command item correctly", () => {
      const item = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "[PAUSE]",
        type: "command" as const,
        command: "PAUSE" as const,
        addedAt: "2026-01-13T10:30:00.000Z",
      };

      const line = formatQueueLine(item);

      expect(line).toBe("2026-01-13T10:30:00.000Z | [PAUSE]");
    });

    it("should be reversible with parseQueueLine", () => {
      const originalItem = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "Test message",
        type: "prompt" as const,
        addedAt: "2026-01-13T10:30:00.000Z",
      };

      const line = formatQueueLine(originalItem);
      const parsedItem = parseQueueLine(line);

      expect(parsedItem).not.toBeNull();
      expect(parsedItem!.content).toBe(originalItem.content);
      expect(parsedItem!.addedAt).toBe(originalItem.addedAt);
      expect(parsedItem!.type).toBe(originalItem.type);
    });
  });
});

// Queue Types Tests (US-002)
describe("Queue Types", () => {
  describe("Zod Schemas", () => {
    let QueueItemSchema: typeof import("../../src/queue/types").QueueItemSchema;
    let QueueStateSchema: typeof import("../../src/queue/types").QueueStateSchema;
    let QueueCommandTypeSchema: typeof import("../../src/queue/types").QueueCommandTypeSchema;
    let QueueItemTypeSchema: typeof import("../../src/queue/types").QueueItemTypeSchema;

    beforeEach(async () => {
      const module = await import("../../src/queue/types");
      QueueItemSchema = module.QueueItemSchema;
      QueueStateSchema = module.QueueStateSchema;
      QueueCommandTypeSchema = module.QueueCommandTypeSchema;
      QueueItemTypeSchema = module.QueueItemTypeSchema;
    });

    it("should validate QueueCommandType enum", () => {
      expect(QueueCommandTypeSchema.parse("PAUSE")).toBe("PAUSE");
      expect(QueueCommandTypeSchema.parse("SKIP")).toBe("SKIP");
      expect(QueueCommandTypeSchema.parse("PRIORITY")).toBe("PRIORITY");
      expect(QueueCommandTypeSchema.parse("ABORT")).toBe("ABORT");
      expect(() => QueueCommandTypeSchema.parse("INVALID")).toThrow();
    });

    it("should validate QueueItemType enum", () => {
      expect(QueueItemTypeSchema.parse("prompt")).toBe("prompt");
      expect(QueueItemTypeSchema.parse("command")).toBe("command");
      expect(() => QueueItemTypeSchema.parse("invalid")).toThrow();
    });

    it("should validate a prompt QueueItem", () => {
      const item = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "Focus on error handling",
        type: "prompt",
        addedAt: "2026-01-13T10:30:00.000Z",
      };

      const result = QueueItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it("should validate a command QueueItem", () => {
      const item = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "[SKIP US-003]",
        type: "command",
        command: "SKIP",
        targetStoryId: "US-003",
        addedAt: "2026-01-13T10:30:00.000Z",
      };

      const result = QueueItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it("should reject QueueItem with invalid type", () => {
      const item = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "Test",
        type: "invalid",
        addedAt: "2026-01-13T10:30:00.000Z",
      };

      const result = QueueItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it("should validate QueueState", () => {
      const state = {
        featurePath: "/path/to/feature",
        pending: [],
        processed: [],
        lastChecked: "2026-01-13T10:30:00.000Z",
      };

      const result = QueueStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it("should allow optional fields in QueueItem", () => {
      const item = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "Test",
        type: "prompt",
        addedAt: "2026-01-13T10:30:00.000Z",
        // command, targetStoryId, processedAt are optional
      };

      const result = QueueItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it("should validate processedAt timestamp format", () => {
      const item = {
        id: "2026-01-13T10-30-00-000Z-0",
        content: "Test",
        type: "prompt",
        addedAt: "2026-01-13T10:30:00.000Z",
        processedAt: "2026-01-13T10:35:00.000Z",
      };

      const result = QueueItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });
  });
});
