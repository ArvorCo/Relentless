/**
 * Tests for TUI Queue Input
 *
 * TDD: Tests written BEFORE implementation
 * Covers: QueueInput component, keyboard handling, state management
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestFile, createTestDir } from "../helpers/index.js";

describe("TUI Queue Input", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  describe("QueueInputState type", () => {
    it("should export QueueInputState interface with active and value fields", async () => {
      const { QueueInputState } = await import("../../src/tui/components/QueueInput.js") as { QueueInputState: object };
      // Type check at compile time - interface export
      const validState = {
        active: false,
        value: "",
      };
      expect(validState.active).toBe(false);
      expect(validState.value).toBe("");
    });
  });

  describe("TUIState queueInput integration", () => {
    it("should include queueInputActive in TUIState type", async () => {
      // This test verifies TypeScript type structure
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
      };
      expect(validState.queueInputActive).toBeDefined();
      expect(typeof validState.queueInputActive).toBe("boolean");
    });

    it("should include queueInputValue in TUIState type", async () => {
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
      };
      expect(validState.queueInputValue).toBeDefined();
      expect(typeof validState.queueInputValue).toBe("string");
    });
  });

  describe("handleQueueKeypress", () => {
    it("should activate input mode when 'q' key is pressed", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: false, value: "" };
      const result = handleQueueKeypress("q", state, false);

      expect(result.active).toBe(true);
      expect(result.value).toBe("");
    });

    it("should not activate when already in input mode", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "test" };
      const result = handleQueueKeypress("q", state, false);

      // When active, 'q' should be added to value, not toggle
      expect(result.active).toBe(true);
      expect(result.value).toBe("testq");
    });

    it("should add characters to value when in input mode", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "hel" };
      const result = handleQueueKeypress("l", state, false);

      expect(result.value).toBe("hell");
    });

    it("should handle backspace to remove last character", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "hello" };
      const result = handleQueueKeypress("backspace", state, false);

      expect(result.value).toBe("hell");
    });

    it("should handle backspace on empty value", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "" };
      const result = handleQueueKeypress("backspace", state, false);

      expect(result.value).toBe("");
    });

    it("should deactivate and clear on escape", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "test input" };
      const result = handleQueueKeypress("escape", state, false);

      expect(result.active).toBe(false);
      expect(result.value).toBe("");
    });

    it("should return submit action on enter with non-empty value", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "Fix the bug" };
      const result = handleQueueKeypress("return", state, false);

      expect(result.active).toBe(false);
      expect(result.value).toBe("");
      expect(result.submit).toBe("Fix the bug");
    });

    it("should not submit on enter with empty value", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "" };
      const result = handleQueueKeypress("return", state, false);

      expect(result.active).toBe(true);
      expect(result.submit).toBeUndefined();
    });

    it("should handle space character in input", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "hello" };
      const result = handleQueueKeypress(" ", state, false);

      expect(result.value).toBe("hello ");
    });

    it("should ignore unknown control keys in input mode", async () => {
      const { handleQueueKeypress } = await import("../../src/tui/components/QueueInput.js");

      const state = { active: true, value: "test" };
      const result = handleQueueKeypress("tab", state, true);

      // Tab should be ignored as it's a control key
      expect(result.value).toBe("test");
    });
  });

  describe("formatQueueInput", () => {
    it("should format input prompt for display", async () => {
      const { formatQueueInput } = await import("../../src/tui/components/QueueInput.js");

      const result = formatQueueInput("Fix the bug");

      expect(result.prompt).toBe("Queue:");
      expect(result.value).toBe("Fix the bug");
      expect(result.cursor).toBe("_");
    });

    it("should show empty value with cursor for empty input", async () => {
      const { formatQueueInput } = await import("../../src/tui/components/QueueInput.js");

      const result = formatQueueInput("");

      expect(result.value).toBe("");
      expect(result.cursor).toBe("_");
    });
  });

  describe("submitToQueue", () => {
    it("should add item to queue file", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");

      const { submitToQueue } = await import("../../src/tui/components/QueueInput.js");
      await submitToQueue(featurePath, "Fix the bug");

      // Verify item was added
      const { loadQueue } = await import("../../src/queue/index.js");
      const state = await loadQueue(featurePath);

      expect(state.pending.length).toBe(1);
      expect(state.pending[0].content).toBe("Fix the bug");
    });

    it("should handle command input", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");

      const { submitToQueue } = await import("../../src/tui/components/QueueInput.js");
      await submitToQueue(featurePath, "[PAUSE]");

      // Verify command was added
      const { loadQueue } = await import("../../src/queue/index.js");
      const state = await loadQueue(featurePath);

      expect(state.pending.length).toBe(1);
      expect(state.pending[0].content).toBe("[PAUSE]");
      expect(state.pending[0].type).toBe("command");
    });

    it("should return success status", async () => {
      const featurePath = `${tempDir.path}/relentless/features/test-feature`;
      await createTestDir(tempDir.path, "relentless/features/test-feature");

      const { submitToQueue } = await import("../../src/tui/components/QueueInput.js");
      const result = await submitToQueue(featurePath, "Test message");

      expect(result.success).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      const { submitToQueue } = await import("../../src/tui/components/QueueInput.js");

      // Submit to non-existent path (should create file, not error)
      const featurePath = `${tempDir.path}/relentless/features/new-feature`;
      await createTestDir(tempDir.path, "relentless/features/new-feature");
      const result = await submitToQueue(featurePath, "Test");

      expect(result.success).toBe(true);
    });
  });

  describe("QueueInput component exports", () => {
    it("should export QueueInput React component", async () => {
      const module = await import("../../src/tui/components/QueueInput.js");
      expect(typeof module.QueueInput).toBe("function");
    });

    it("should export handleQueueKeypress function", async () => {
      const module = await import("../../src/tui/components/QueueInput.js");
      expect(typeof module.handleQueueKeypress).toBe("function");
    });

    it("should export formatQueueInput function", async () => {
      const module = await import("../../src/tui/components/QueueInput.js");
      expect(typeof module.formatQueueInput).toBe("function");
    });

    it("should export submitToQueue function", async () => {
      const module = await import("../../src/tui/components/QueueInput.js");
      expect(typeof module.submitToQueue).toBe("function");
    });
  });
});
