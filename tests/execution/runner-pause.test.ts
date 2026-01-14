/**
 * Runner PAUSE Command Tests
 *
 * Tests for the PAUSE command execution in the runner.
 * Verifies that the orchestrator pauses and waits for user input.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

// Test utilities
function createTempDir(): { path: string; cleanup: () => void } {
  const path = join(tmpdir(), `relentless-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(path, { recursive: true });
  return {
    path,
    cleanup: () => {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    },
  };
}

describe("PAUSE Command Execution", () => {
  let tempDir: { path: string; cleanup: () => void };
  let featurePath: string;

  beforeEach(() => {
    tempDir = createTempDir();
    featurePath = join(tempDir.path, "features", "test-feature");
    mkdirSync(featurePath, { recursive: true });
  });

  afterEach(() => {
    tempDir.cleanup();
  });

  describe("handlePauseCommand", () => {
    it("should return a pause action object", async () => {
      const { handlePauseCommand } = await import("../../src/execution/commands");

      const action = handlePauseCommand();

      expect(action).toBeDefined();
      expect(action.type).toBe("pause");
      expect(action.message).toBe("Paused by user. Press Enter to continue...");
    });

    it("should include custom message when provided", async () => {
      const { handlePauseCommand } = await import("../../src/execution/commands");

      const action = handlePauseCommand("Custom pause reason");

      expect(action.message).toContain("Custom pause reason");
    });
  });

  describe("executePauseAction", () => {
    it("should wait for simulated input in test mode", async () => {
      const { executePauseAction } = await import("../../src/execution/commands");

      // In test mode, we pass a mock input function
      const mockInput = async () => "";
      const result = await executePauseAction(mockInput);

      expect(result.resumed).toBe(true);
    });

    it("should return resumed status after input", async () => {
      const { executePauseAction } = await import("../../src/execution/commands");

      let inputCalled = false;
      const mockInput = async () => {
        inputCalled = true;
        return "";
      };

      const result = await executePauseAction(mockInput);

      expect(inputCalled).toBe(true);
      expect(result.resumed).toBe(true);
    });
  });

  describe("logPauseToProgress", () => {
    it("should log pause event to progress.txt", async () => {
      const progressPath = join(featurePath, "progress.txt");
      const initialProgress = `---
feature: test-feature
started: "2026-01-14"
last_updated: "2026-01-14"
stories_completed: 0
patterns: []
---

# Progress Log: test-feature

`;
      await Bun.write(progressPath, initialProgress);

      const { logPauseToProgress } = await import("../../src/execution/commands");

      await logPauseToProgress(progressPath);

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("## Pause Event");
      expect(content).toContain("User requested pause via [PAUSE] command");
    });

    it("should include timestamp in pause log", async () => {
      const progressPath = join(featurePath, "progress.txt");
      const initialProgress = `---
feature: test-feature
started: "2026-01-14"
last_updated: "2026-01-14"
stories_completed: 0
patterns: []
---

# Progress Log

`;
      await Bun.write(progressPath, initialProgress);

      const { logPauseToProgress } = await import("../../src/execution/commands");

      await logPauseToProgress(progressPath);

      const content = await Bun.file(progressPath).text();
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("formatPauseMessage", () => {
    it("should format pause message for display", async () => {
      const { formatPauseMessage } = await import("../../src/execution/commands");

      const message = formatPauseMessage();

      expect(message).toContain("Paused");
      expect(message).toContain("Press Enter");
    });

    it("should format pause message for TUI mode", async () => {
      const { formatPauseMessage } = await import("../../src/execution/commands");

      const message = formatPauseMessage(true);

      expect(message).toContain("Paused");
      // TUI mode should have specific formatting
      expect(message).toBeDefined();
    });
  });
});

describe("PAUSE Command Integration", () => {
  let tempDir: { path: string; cleanup: () => void };
  let featurePath: string;

  beforeEach(() => {
    tempDir = createTempDir();
    featurePath = join(tempDir.path, "features", "test-feature");
    mkdirSync(featurePath, { recursive: true });
  });

  afterEach(() => {
    tempDir.cleanup();
  });

  it("should detect PAUSE command from queue", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [PAUSE]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "PAUSE" });
  });

  it("should handle PAUSE command case-insensitively", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [pause]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "PAUSE" });
  });

  it("should process PAUSE alongside prompts", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(
      queuePath,
      `${timestamp} | Focus on tests\n${timestamp} | [PAUSE]\n${timestamp} | Check performance\n`
    );

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    // Should have both prompts and the pause command
    expect(result.prompts).toContain("Focus on tests");
    expect(result.prompts).toContain("Check performance");
    expect(result.commands).toContainEqual({ type: "PAUSE" });
  });

  it("should create pause action from command list", async () => {
    const { handlePauseCommand, shouldPause } = await import("../../src/execution/commands");

    const commands = [{ type: "PAUSE" as const }];
    const pauseNeeded = shouldPause(commands);

    expect(pauseNeeded).toBe(true);

    const action = handlePauseCommand();
    expect(action.type).toBe("pause");
  });

  it("should not pause when no PAUSE command", async () => {
    const { shouldPause } = await import("../../src/execution/commands");

    const commands = [{ type: "SKIP" as const, storyId: "US-001" }];
    const pauseNeeded = shouldPause(commands);

    expect(pauseNeeded).toBe(false);
  });
});
