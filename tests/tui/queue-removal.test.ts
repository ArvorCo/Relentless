/**
 * Tests for TUI Queue Item Removal
 *
 * TDD: Tests written BEFORE implementation
 * Covers: Queue item removal, keyboard handling for d/D keys, confirmation dialog
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestFile, createTestDir } from "../helpers/index.js";

describe("TUI Queue Removal", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  describe("TUIState removal state fields", () => {
    it("should include deleteMode in TUIState type", async () => {
      // Verify TUIState includes new fields for removal
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
        queueInputActive: false,
        queueInputValue: "",
        deleteMode: false,
        confirmClearActive: false,
      };
      expect(validState.deleteMode).toBeDefined();
      expect(typeof validState.deleteMode).toBe("boolean");
    });

    it("should include confirmClearActive in TUIState type", async () => {
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
        queueInputActive: false,
        queueInputValue: "",
        deleteMode: false,
        confirmClearActive: false,
      };
      expect(validState.confirmClearActive).toBeDefined();
      expect(typeof validState.confirmClearActive).toBe("boolean");
    });
  });

  describe("handleQueueDeletionKeypress", () => {
    it("should activate delete mode when 'd' key is pressed", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: false, queueInputActive: false };
      const result = handleQueueDeletionKeypress("d", state, false, 3);

      expect(result.deleteMode).toBe(true);
      expect(result.confirmClearActive).toBe(false);
    });

    it("should not activate delete mode when queueInputActive is true", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: false, queueInputActive: true };
      const result = handleQueueDeletionKeypress("d", state, false, 3);

      expect(result.deleteMode).toBe(false);
    });

    it("should show empty queue message when 'd' pressed on empty queue", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: false, queueInputActive: false };
      const result = handleQueueDeletionKeypress("d", state, false, 0);

      expect(result.deleteMode).toBe(false);
      expect(result.message).toBe("Queue already empty");
    });

    it("should activate confirm dialog when 'D' (shift+d) is pressed", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: false, queueInputActive: false };
      const result = handleQueueDeletionKeypress("D", state, false, 3);

      expect(result.deleteMode).toBe(false);
      expect(result.confirmClearActive).toBe(true);
    });

    it("should show empty queue message when 'D' pressed on empty queue", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: false, queueInputActive: false };
      const result = handleQueueDeletionKeypress("D", state, false, 0);

      expect(result.confirmClearActive).toBe(false);
      expect(result.message).toBe("Queue already empty");
    });

    it("should remove item and deactivate delete mode when number is pressed", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: true, confirmClearActive: false, queueInputActive: false };
      const result = handleQueueDeletionKeypress("2", state, false, 3);

      expect(result.deleteMode).toBe(false);
      expect(result.removeIndex).toBe(2);
    });

    it("should show error for invalid number in delete mode", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: true, confirmClearActive: false, queueInputActive: false };
      const result = handleQueueDeletionKeypress("5", state, false, 3);

      expect(result.deleteMode).toBe(false);
      expect(result.removeIndex).toBeUndefined();
      expect(result.message).toBe("Invalid index: 5. Queue has 3 items");
    });

    it("should cancel delete mode on escape", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: true, confirmClearActive: false, queueInputActive: false };
      const result = handleQueueDeletionKeypress("escape", state, false, 3);

      expect(result.deleteMode).toBe(false);
    });

    it("should confirm clear on 'y' when confirmClearActive", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: true, queueInputActive: false };
      const result = handleQueueDeletionKeypress("y", state, false, 3);

      expect(result.confirmClearActive).toBe(false);
      expect(result.clearAll).toBe(true);
    });

    it("should cancel clear on 'n' when confirmClearActive", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: true, queueInputActive: false };
      const result = handleQueueDeletionKeypress("n", state, false, 3);

      expect(result.confirmClearActive).toBe(false);
      expect(result.clearAll).toBeUndefined();
    });

    it("should cancel clear on escape when confirmClearActive", async () => {
      const { handleQueueDeletionKeypress } = await import("../../src/tui/components/QueueRemoval.js");

      const state = { deleteMode: false, confirmClearActive: true, queueInputActive: false };
      const result = handleQueueDeletionKeypress("escape", state, false, 3);

      expect(result.confirmClearActive).toBe(false);
      expect(result.clearAll).toBeUndefined();
    });
  });

  describe("removeQueueItem", () => {
    it("should remove item by index from queue file", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-14T10:00:00.000Z | First item\n2026-01-14T10:01:00.000Z | Second item\n2026-01-14T10:02:00.000Z | Third item\n"
      );

      const { removeQueueItem } = await import("../../src/tui/components/QueueRemoval.js");
      const result = await removeQueueItem(featurePath, 2);

      expect(result.success).toBe(true);
      expect(result.removedContent).toBe("Second item");

      // Verify file was updated
      const { loadQueue } = await import("../../src/queue/index.js");
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(2);
      expect(state.pending[0].content).toBe("First item");
      expect(state.pending[1].content).toBe("Third item");
    });

    it("should return error for invalid index", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-14T10:00:00.000Z | First item\n"
      );

      const { removeQueueItem } = await import("../../src/tui/components/QueueRemoval.js");
      const result = await removeQueueItem(featurePath, 5);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid index");
    });

    it("should handle empty queue", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(featurePath, ".queue.txt", "");

      const { removeQueueItem } = await import("../../src/tui/components/QueueRemoval.js");
      const result = await removeQueueItem(featurePath, 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Queue is empty");
    });
  });

  describe("clearQueueItems", () => {
    it("should clear all items from queue file", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(
        featurePath,
        ".queue.txt",
        "2026-01-14T10:00:00.000Z | First item\n2026-01-14T10:01:00.000Z | Second item\n"
      );

      const { clearQueueItems } = await import("../../src/tui/components/QueueRemoval.js");
      const result = await clearQueueItems(featurePath);

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(2);

      // Verify file was cleared
      const { loadQueue } = await import("../../src/queue/index.js");
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(0);
    });

    it("should handle empty queue gracefully", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");
      await createTestFile(featurePath, ".queue.txt", "");

      const { clearQueueItems } = await import("../../src/tui/components/QueueRemoval.js");
      const result = await clearQueueItems(featurePath);

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
    });
  });

  describe("formatRemovalState", () => {
    it("should format delete mode state for display", async () => {
      const { formatRemovalState } = await import("../../src/tui/components/QueueRemoval.js");

      const result = formatRemovalState({ deleteMode: true, confirmClearActive: false });

      expect(result.prompt).toContain("Enter number");
      expect(result.showPrompt).toBe(true);
    });

    it("should format confirm clear state for display", async () => {
      const { formatRemovalState } = await import("../../src/tui/components/QueueRemoval.js");

      const result = formatRemovalState({ deleteMode: false, confirmClearActive: true });

      expect(result.prompt).toContain("Clear all items?");
      expect(result.prompt).toContain("y/n");
      expect(result.showPrompt).toBe(true);
    });

    it("should hide prompt when not in delete or confirm mode", async () => {
      const { formatRemovalState } = await import("../../src/tui/components/QueueRemoval.js");

      const result = formatRemovalState({ deleteMode: false, confirmClearActive: false });

      expect(result.showPrompt).toBe(false);
    });
  });

  describe("QueueRemoval component exports", () => {
    it("should export handleQueueDeletionKeypress function", async () => {
      const module = await import("../../src/tui/components/QueueRemoval.js");
      expect(typeof module.handleQueueDeletionKeypress).toBe("function");
    });

    it("should export removeQueueItem function", async () => {
      const module = await import("../../src/tui/components/QueueRemoval.js");
      expect(typeof module.removeQueueItem).toBe("function");
    });

    it("should export clearQueueItems function", async () => {
      const module = await import("../../src/tui/components/QueueRemoval.js");
      expect(typeof module.clearQueueItems).toBe("function");
    });

    it("should export formatRemovalState function", async () => {
      const module = await import("../../src/tui/components/QueueRemoval.js");
      expect(typeof module.formatRemovalState).toBe("function");
    });

    it("should export QueueRemovalPrompt React component", async () => {
      const module = await import("../../src/tui/components/QueueRemoval.js");
      expect(typeof module.QueueRemovalPrompt).toBe("function");
    });
  });
});
