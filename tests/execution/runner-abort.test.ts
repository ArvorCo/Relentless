/**
 * Runner ABORT Command Tests
 *
 * Tests for the ABORT command execution in the runner.
 * Verifies that the orchestrator stops immediately and cleanly.
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

describe("ABORT Command Execution", () => {
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

  describe("shouldAbort", () => {
    it("should detect ABORT command in command list", async () => {
      const { shouldAbort } = await import("../../src/execution/commands");

      const commands = [{ type: "ABORT" as const }];
      const result = shouldAbort(commands);

      expect(result).toBe(true);
    });

    it("should return false when no ABORT command", async () => {
      const { shouldAbort } = await import("../../src/execution/commands");

      const commands = [{ type: "PAUSE" as const }];
      const result = shouldAbort(commands);

      expect(result).toBe(false);
    });

    it("should return false for empty command list", async () => {
      const { shouldAbort } = await import("../../src/execution/commands");

      const commands: Array<{ type: "PAUSE" | "ABORT" | "SKIP" | "PRIORITY" }> = [];
      const result = shouldAbort(commands);

      expect(result).toBe(false);
    });
  });

  describe("handleAbortCommand", () => {
    it("should return an abort action object", async () => {
      const { handleAbortCommand } = await import("../../src/execution/commands");

      const action = handleAbortCommand();

      expect(action).toBeDefined();
      expect(action.type).toBe("abort");
      expect(action.reason).toBe("User requested abort via [ABORT] command");
    });

    it("should include custom reason when provided", async () => {
      const { handleAbortCommand } = await import("../../src/execution/commands");

      const action = handleAbortCommand("Custom abort reason");

      expect(action.reason).toBe("Custom abort reason");
    });

    it("should have exitCode 0 (clean exit)", async () => {
      const { handleAbortCommand } = await import("../../src/execution/commands");

      const action = handleAbortCommand();

      expect(action.exitCode).toBe(0);
    });
  });

  describe("logAbortToProgress", () => {
    it("should log abort event to progress.txt", async () => {
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

      const { logAbortToProgress } = await import("../../src/execution/commands");

      await logAbortToProgress(progressPath);

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("## Abort Event");
      expect(content).toContain("User requested abort via [ABORT] command");
    });

    it("should include timestamp in abort log", async () => {
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

      const { logAbortToProgress } = await import("../../src/execution/commands");

      await logAbortToProgress(progressPath);

      const content = await Bun.file(progressPath).text();
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("should log abort with custom reason", async () => {
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

      const { logAbortToProgress } = await import("../../src/execution/commands");

      await logAbortToProgress(progressPath, "Emergency stop requested");

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("Emergency stop requested");
    });
  });

  describe("formatAbortMessage", () => {
    it("should format abort message for display", async () => {
      const { formatAbortMessage } = await import("../../src/execution/commands");

      const message = formatAbortMessage();

      expect(message).toContain("Aborted");
    });

    it("should format abort message for TUI mode", async () => {
      const { formatAbortMessage } = await import("../../src/execution/commands");

      const message = formatAbortMessage(true);

      expect(message).toContain("Aborted");
      // TUI mode should have specific formatting
      expect(message).toBeDefined();
    });
  });
});

describe("ABORT Command Integration", () => {
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

  it("should detect ABORT command from queue", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [ABORT]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "ABORT" });
  });

  it("should handle ABORT command case-insensitively", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [abort]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "ABORT" });
  });

  it("should process ABORT alongside prompts", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(
      queuePath,
      `${timestamp} | Focus on tests\n${timestamp} | [ABORT]\n${timestamp} | Check performance\n`
    );

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    // Should have both prompts and the abort command
    expect(result.prompts).toContain("Focus on tests");
    expect(result.prompts).toContain("Check performance");
    expect(result.commands).toContainEqual({ type: "ABORT" });
  });

  it("should create abort action from command list", async () => {
    const { handleAbortCommand, shouldAbort } = await import("../../src/execution/commands");

    const commands = [{ type: "ABORT" as const }];
    const abortNeeded = shouldAbort(commands);

    expect(abortNeeded).toBe(true);

    const action = handleAbortCommand();
    expect(action.type).toBe("abort");
    expect(action.exitCode).toBe(0);
  });

  it("should not abort when no ABORT command", async () => {
    const { shouldAbort } = await import("../../src/execution/commands");

    const commands = [{ type: "SKIP" as const, storyId: "US-001" }];
    const abortNeeded = shouldAbort(commands);

    expect(abortNeeded).toBe(false);
  });
});

describe("ABORT Progress Summary", () => {
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

  it("should generate progress summary for abort", async () => {
    const { generateAbortSummary } = await import("../../src/execution/commands");

    const summary = generateAbortSummary({
      storiesCompleted: 5,
      storiesTotal: 10,
      iterations: 15,
      duration: 120000, // 2 minutes
    });

    expect(summary).toContain("5");
    expect(summary).toContain("10");
    expect(summary).toContain("15");
    // Duration should be formatted
    expect(summary).toBeDefined();
  });

  it("should handle zero progress", async () => {
    const { generateAbortSummary } = await import("../../src/execution/commands");

    const summary = generateAbortSummary({
      storiesCompleted: 0,
      storiesTotal: 5,
      iterations: 0,
      duration: 0,
    });

    expect(summary).toContain("0");
    expect(summary).toContain("5");
  });
});
