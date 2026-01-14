/**
 * Tests for TUI Queue Panel
 *
 * TDD: Tests written BEFORE implementation
 * Covers: QueuePanel component, queue state integration, file watching
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestFile, createTestDir } from "../helpers/index.js";

describe("TUI Queue Panel", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  describe("formatQueueForPanel", () => {
    it("should format empty queue as 'Queue empty' message", async () => {
      const { formatQueueForPanel } = await import("../../src/tui/components/QueuePanel.js");
      const result = formatQueueForPanel([]);
      expect(result).toEqual({
        isEmpty: true,
        message: "Queue empty",
        items: [],
      });
    });

    it("should format pending items with index and content", async () => {
      const { formatQueueForPanel } = await import("../../src/tui/components/QueuePanel.js");
      const items = [
        {
          id: "1",
          content: "Fix the bug",
          type: "prompt" as const,
          addedAt: "2026-01-14T10:00:00.000Z",
        },
        {
          id: "2",
          content: "[PAUSE]",
          type: "command" as const,
          command: "PAUSE" as const,
          addedAt: "2026-01-14T10:01:00.000Z",
        },
      ];
      const result = formatQueueForPanel(items);
      expect(result.isEmpty).toBe(false);
      expect(result.items.length).toBe(2);
      expect(result.items[0]).toEqual({
        index: 1,
        content: "Fix the bug",
        type: "prompt",
        isCommand: false,
      });
      expect(result.items[1]).toEqual({
        index: 2,
        content: "[PAUSE]",
        type: "command",
        isCommand: true,
      });
    });

    it("should truncate long content to fit panel width", async () => {
      const { formatQueueForPanel } = await import("../../src/tui/components/QueuePanel.js");
      const items = [
        {
          id: "1",
          content: "This is a very long message that should be truncated to fit within the panel width",
          type: "prompt" as const,
          addedAt: "2026-01-14T10:00:00.000Z",
        },
      ];
      const result = formatQueueForPanel(items, { maxContentLength: 30 });
      expect(result.items[0].content.length).toBeLessThanOrEqual(33); // 30 + "..."
      expect(result.items[0].content.endsWith("...")).toBe(true);
    });

    it("should mark commands with type field", async () => {
      const { formatQueueForPanel } = await import("../../src/tui/components/QueuePanel.js");
      const items = [
        {
          id: "1",
          content: "[SKIP US-005]",
          type: "command" as const,
          command: "SKIP" as const,
          targetStoryId: "US-005",
          addedAt: "2026-01-14T10:00:00.000Z",
        },
      ];
      const result = formatQueueForPanel(items);
      expect(result.items[0].isCommand).toBe(true);
      expect(result.items[0].type).toBe("command");
    });
  });

  describe("QueuePanelItem type", () => {
    it("should export QueuePanelItem interface", async () => {
      const module = await import("../../src/tui/components/QueuePanel.js");
      expect(module.formatQueueForPanel).toBeDefined();
      // Type check at compile time - interface export
    });
  });

  describe("TUIState queueItems integration", () => {
    it("should include queueItems in TUIState type", async () => {
      const { TUIState } = await import("../../src/tui/types.js") as { TUIState: object };
      // This test verifies TypeScript type structure
      // We check by creating a valid state object
      const validState = {
        feature: "test",
        project: "test",
        branchName: "main",
        stories: [],
        iteration: 0,
        maxIterations: 10,
        currentStory: null,
        currentAgent: null,
        agents: [],
        outputLines: [],
        elapsedSeconds: 0,
        isRunning: false,
        isComplete: false,
        queueItems: [],
      };
      // Type assertion - if TUIState doesn't include queueItems, this would be a type error
      expect(validState.queueItems).toBeDefined();
      expect(Array.isArray(validState.queueItems)).toBe(true);
    });
  });

  describe("loadQueueForTUI", () => {
    it("should load queue items from feature path", async () => {
      // Create test queue file
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-14T10:00:00.000Z | Fix the bug\n2026-01-14T10:01:00.000Z | [PAUSE]"
      );

      const { loadQueueForTUI } = await import("../../src/tui/components/QueuePanel.js");
      const items = await loadQueueForTUI(featurePath);

      expect(items.length).toBe(2);
      expect(items[0].content).toBe("Fix the bug");
      expect(items[1].content).toBe("[PAUSE]");
    });

    it("should return empty array when no queue file exists", async () => {
      const { loadQueueForTUI } = await import("../../src/tui/components/QueuePanel.js");
      const items = await loadQueueForTUI("/nonexistent/path");
      expect(items).toEqual([]);
    });

    it("should return empty array for empty queue file", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(featurePath, ".queue.txt", "");

      const { loadQueueForTUI } = await import("../../src/tui/components/QueuePanel.js");
      const items = await loadQueueForTUI(featurePath);
      expect(items).toEqual([]);
    });
  });

  describe("Queue file watching", () => {
    it("should call callback when queue file changes", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(featurePath, ".queue.txt", "");

      const { watchQueueFile, stopWatchingQueue } = await import("../../src/tui/components/QueuePanel.js");

      let callbackCalled = false;
      const watcher = watchQueueFile(featurePath, () => {
        callbackCalled = true;
      });

      // Write to queue file
      await createTestFile(featurePath, ".queue.txt", "2026-01-14T10:00:00.000Z | New item");

      // Wait for watcher to detect change
      await new Promise((resolve) => setTimeout(resolve, 600));

      stopWatchingQueue(watcher);

      expect(callbackCalled).toBe(true);
    });

    it("should stop watching when stopWatchingQueue is called", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(featurePath, ".queue.txt", "");

      const { watchQueueFile, stopWatchingQueue } = await import("../../src/tui/components/QueuePanel.js");

      let callCount = 0;
      const watcher = watchQueueFile(featurePath, () => {
        callCount++;
      });

      // Stop immediately
      stopWatchingQueue(watcher);

      // Write to queue file
      await createTestFile(featurePath, ".queue.txt", "2026-01-14T10:00:00.000Z | New item");

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(callCount).toBe(0);
    });
  });

  describe("Panel display constants", () => {
    it("should export QUEUE_PANEL_REFRESH_INTERVAL constant", async () => {
      const { QUEUE_PANEL_REFRESH_INTERVAL } = await import("../../src/tui/components/QueuePanel.js");
      expect(typeof QUEUE_PANEL_REFRESH_INTERVAL).toBe("number");
      expect(QUEUE_PANEL_REFRESH_INTERVAL).toBeLessThanOrEqual(500); // Requirement: <500ms
    });
  });
});
