/**
 * Runner Queue Integration Tests
 *
 * Tests for queue processing integration in the execution runner.
 * Verifies that queue items are processed and injected into agent prompts.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
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

describe("Runner Queue Integration", () => {
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

  describe("processQueueForIteration", () => {
    it("should process queue at start of iteration", async () => {
      // Create queue file with items
      const queuePath = join(featurePath, ".queue.txt");
      const timestamp = new Date().toISOString();
      await Bun.write(queuePath, `${timestamp} | Focus on error handling\n`);

      // Import the function we're testing
      const { processQueueForIteration } = await import("../../src/execution/runner");

      const result = await processQueueForIteration(featurePath);

      expect(result).toBeDefined();
      expect(result.prompts).toContain("Focus on error handling");
    });

    it("should return empty result for missing queue file", async () => {
      const { processQueueForIteration } = await import("../../src/execution/runner");

      const result = await processQueueForIteration(featurePath);

      expect(result.prompts).toEqual([]);
      expect(result.commands).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("should return empty result for empty queue file", async () => {
      const queuePath = join(featurePath, ".queue.txt");
      await Bun.write(queuePath, "");

      const { processQueueForIteration } = await import("../../src/execution/runner");

      const result = await processQueueForIteration(featurePath);

      expect(result.prompts).toEqual([]);
      expect(result.commands).toEqual([]);
    });

    it("should process multiple queue items in FIFO order", async () => {
      const queuePath = join(featurePath, ".queue.txt");
      const timestamp1 = "2026-01-14T10:00:00.000Z";
      const timestamp2 = "2026-01-14T10:01:00.000Z";
      await Bun.write(
        queuePath,
        `${timestamp1} | First message\n${timestamp2} | Second message\n`
      );

      const { processQueueForIteration } = await import("../../src/execution/runner");

      const result = await processQueueForIteration(featurePath);

      expect(result.prompts).toEqual(["First message", "Second message"]);
    });

    it("should separate prompts from commands", async () => {
      const queuePath = join(featurePath, ".queue.txt");
      const timestamp = new Date().toISOString();
      await Bun.write(
        queuePath,
        `${timestamp} | Focus on tests\n${timestamp} | [PAUSE]\n`
      );

      const { processQueueForIteration } = await import("../../src/execution/runner");

      const result = await processQueueForIteration(featurePath);

      expect(result.prompts).toContain("Focus on tests");
      expect(result.commands).toContainEqual({ type: "PAUSE" });
    });

    it("should complete quickly (<100ms)", async () => {
      // Create queue with a few items
      const queuePath = join(featurePath, ".queue.txt");
      const timestamp = new Date().toISOString();
      await Bun.write(
        queuePath,
        `${timestamp} | Item 1\n${timestamp} | Item 2\n${timestamp} | Item 3\n`
      );

      const { processQueueForIteration } = await import("../../src/execution/runner");

      const start = performance.now();
      await processQueueForIteration(featurePath);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe("injectQueuePrompts", () => {
    it("should inject queue prompts into base prompt", async () => {
      const { injectQueuePrompts } = await import("../../src/execution/runner");

      const basePrompt = "You are an AI agent working on a feature.";
      const queuePrompts = ["Focus on error handling", "Run tests after each change"];

      const result = injectQueuePrompts(basePrompt, queuePrompts);

      expect(result).toContain(basePrompt);
      expect(result).toContain("## Queued User Guidance");
      expect(result).toContain("Focus on error handling");
      expect(result).toContain("Run tests after each change");
    });

    it("should not modify prompt when no queue prompts", async () => {
      const { injectQueuePrompts } = await import("../../src/execution/runner");

      const basePrompt = "You are an AI agent.";
      const result = injectQueuePrompts(basePrompt, []);

      expect(result).toBe(basePrompt);
    });

    it("should format multiple prompts as numbered list", async () => {
      const { injectQueuePrompts } = await import("../../src/execution/runner");

      const basePrompt = "Base prompt.";
      const queuePrompts = ["First", "Second", "Third"];

      const result = injectQueuePrompts(basePrompt, queuePrompts);

      expect(result).toContain("1. First");
      expect(result).toContain("2. Second");
      expect(result).toContain("3. Third");
    });
  });

  describe("acknowledgeQueueInProgress", () => {
    it("should append queue acknowledgment to progress.txt", async () => {
      // Create progress.txt with frontmatter
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

      const { acknowledgeQueueInProgress } = await import("../../src/execution/runner");

      const prompts = ["Focus on tests", "Check error handling"];
      await acknowledgeQueueInProgress(progressPath, prompts);

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("## Queue Processed");
      expect(content).toContain("Focus on tests");
      expect(content).toContain("Check error handling");
    });

    it("should include timestamp in acknowledgment", async () => {
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

      const { acknowledgeQueueInProgress } = await import("../../src/execution/runner");

      await acknowledgeQueueInProgress(progressPath, ["Test message"]);

      const content = await Bun.file(progressPath).text();
      // Should include a date/time reference
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("should not modify progress.txt when no prompts", async () => {
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

      const { acknowledgeQueueInProgress } = await import("../../src/execution/runner");

      // Get initial size
      const initialContent = await Bun.file(progressPath).text();

      await acknowledgeQueueInProgress(progressPath, []);

      const finalContent = await Bun.file(progressPath).text();
      // Should not add queue section
      expect(finalContent).not.toContain("## Queue Processed");
    });
  });

  describe("formatQueueLogMessage", () => {
    it("should format message for single item", async () => {
      const { formatQueueLogMessage } = await import("../../src/execution/runner");

      const message = formatQueueLogMessage(1, 0);
      expect(message).toBe("Processing 1 queue item...");
    });

    it("should format message for multiple items", async () => {
      const { formatQueueLogMessage } = await import("../../src/execution/runner");

      const message = formatQueueLogMessage(3, 0);
      expect(message).toBe("Processing 3 queue items...");
    });

    it("should include command count when present", async () => {
      const { formatQueueLogMessage } = await import("../../src/execution/runner");

      const message = formatQueueLogMessage(2, 1);
      expect(message).toContain("1 command");
    });

    it("should return empty string for zero items", async () => {
      const { formatQueueLogMessage } = await import("../../src/execution/runner");

      const message = formatQueueLogMessage(0, 0);
      expect(message).toBe("");
    });
  });
});

describe("Integration: Runner with Queue", () => {
  // Integration tests that verify the full workflow
  // These tests mock the agent to avoid actual execution

  let tempDir: { path: string; cleanup: () => void };

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    tempDir.cleanup();
  });

  it("should process queue items before building prompt", async () => {
    // This is a conceptual test - the actual integration happens in the run() function
    // We verify the building blocks work correctly

    const featurePath = join(tempDir.path, "feature");
    mkdirSync(featurePath, { recursive: true });

    // Setup queue file
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | Important guidance\n`);

    // Process queue
    const { processQueueForIteration } = await import("../../src/execution/runner");
    const queueResult = await processQueueForIteration(featurePath);

    expect(queueResult.prompts).toContain("Important guidance");

    // Inject into prompt
    const { injectQueuePrompts } = await import("../../src/execution/runner");
    const basePrompt = "Base prompt for agent.";
    const finalPrompt = injectQueuePrompts(basePrompt, queueResult.prompts);

    expect(finalPrompt).toContain("Important guidance");
    expect(finalPrompt).toContain("## Queued User Guidance");
  });
});
