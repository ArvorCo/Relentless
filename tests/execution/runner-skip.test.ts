/**
 * Runner SKIP Command Tests
 *
 * Tests for the SKIP command execution in the runner.
 * Verifies that stories can be skipped unless they're in progress.
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

describe("SKIP Command Execution", () => {
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

  describe("shouldSkip", () => {
    it("should detect SKIP command in command list", async () => {
      const { shouldSkip } = await import("../../src/execution/commands");

      const commands = [{ type: "SKIP" as const, storyId: "US-001" }];
      const result = shouldSkip(commands);

      expect(result).toBe(true);
    });

    it("should return false when no SKIP command", async () => {
      const { shouldSkip } = await import("../../src/execution/commands");

      const commands = [{ type: "PAUSE" as const }];
      const result = shouldSkip(commands);

      expect(result).toBe(false);
    });

    it("should return false for empty command list", async () => {
      const { shouldSkip } = await import("../../src/execution/commands");

      const commands: Array<{ type: "PAUSE" | "ABORT" | "SKIP" | "PRIORITY"; storyId?: string }> = [];
      const result = shouldSkip(commands);

      expect(result).toBe(false);
    });
  });

  describe("getSkipCommands", () => {
    it("should return all SKIP commands with story IDs", async () => {
      const { getSkipCommands } = await import("../../src/execution/commands");

      const commands = [
        { type: "SKIP" as const, storyId: "US-001" },
        { type: "PAUSE" as const },
        { type: "SKIP" as const, storyId: "US-003" },
      ];
      const result = getSkipCommands(commands);

      expect(result).toHaveLength(2);
      expect(result[0].storyId).toBe("US-001");
      expect(result[1].storyId).toBe("US-003");
    });

    it("should return empty array when no SKIP commands", async () => {
      const { getSkipCommands } = await import("../../src/execution/commands");

      const commands = [{ type: "PAUSE" as const }];
      const result = getSkipCommands(commands);

      expect(result).toHaveLength(0);
    });
  });

  describe("handleSkipCommand", () => {
    it("should return a skip action object when story not in progress", async () => {
      const { handleSkipCommand } = await import("../../src/execution/commands");

      const action = handleSkipCommand("US-001", null);

      expect(action).toBeDefined();
      expect(action.type).toBe("skip");
      expect(action.storyId).toBe("US-001");
      expect(action.rejected).toBe(false);
    });

    it("should reject skip when story is in progress", async () => {
      const { handleSkipCommand } = await import("../../src/execution/commands");

      const action = handleSkipCommand("US-001", "US-001");

      expect(action.type).toBe("skip");
      expect(action.storyId).toBe("US-001");
      expect(action.rejected).toBe(true);
      expect(action.reason).toContain("story is currently in progress");
    });

    it("should allow skip when different story is in progress", async () => {
      const { handleSkipCommand } = await import("../../src/execution/commands");

      const action = handleSkipCommand("US-003", "US-001");

      expect(action.type).toBe("skip");
      expect(action.storyId).toBe("US-003");
      expect(action.rejected).toBe(false);
    });

    it("should include custom reason when provided", async () => {
      const { handleSkipCommand } = await import("../../src/execution/commands");

      const action = handleSkipCommand("US-001", null, "Story blocked by external dependency");

      expect(action.customReason).toBe("Story blocked by external dependency");
    });
  });

  describe("logSkipToProgress", () => {
    it("should log skip event to progress.txt", async () => {
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

      const { logSkipToProgress } = await import("../../src/execution/commands");

      await logSkipToProgress(progressPath, "US-001");

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("## Skip Event");
      expect(content).toContain("US-001");
    });

    it("should include timestamp in skip log", async () => {
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

      const { logSkipToProgress } = await import("../../src/execution/commands");

      await logSkipToProgress(progressPath, "US-001");

      const content = await Bun.file(progressPath).text();
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("should log skip with custom reason", async () => {
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

      const { logSkipToProgress } = await import("../../src/execution/commands");

      await logSkipToProgress(progressPath, "US-001", "Blocked by external dependency");

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("Blocked by external dependency");
    });

    it("should log rejected skip with warning", async () => {
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

      const { logSkipRejectedToProgress } = await import("../../src/execution/commands");

      await logSkipRejectedToProgress(progressPath, "US-001");

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("Skip Rejected");
      expect(content).toContain("US-001");
      expect(content).toContain("in progress");
    });
  });

  describe("formatSkipMessage", () => {
    it("should format skip message for display", async () => {
      const { formatSkipMessage } = await import("../../src/execution/commands");

      const message = formatSkipMessage("US-001", false);

      expect(message).toContain("Skipped");
      expect(message).toContain("US-001");
    });

    it("should format rejected skip message", async () => {
      const { formatSkipMessage } = await import("../../src/execution/commands");

      const message = formatSkipMessage("US-001", true);

      expect(message).toContain("Cannot skip");
      expect(message).toContain("US-001");
      expect(message).toContain("in progress");
    });

    it("should format skip message for TUI mode", async () => {
      const { formatSkipMessage } = await import("../../src/execution/commands");

      const message = formatSkipMessage("US-001", false, true);

      expect(message).toContain("Skipped");
      expect(message).toBeDefined();
    });
  });
});

describe("SKIP Command Integration", () => {
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

  it("should detect SKIP command from queue", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [SKIP US-001]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "SKIP", storyId: "US-001" });
  });

  it("should handle SKIP command case-insensitively", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [skip US-002]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "SKIP", storyId: "US-002" });
  });

  it("should process SKIP alongside prompts", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(
      queuePath,
      `${timestamp} | Focus on tests\n${timestamp} | [SKIP US-003]\n${timestamp} | Check performance\n`
    );

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    // Should have both prompts and the skip command
    expect(result.prompts).toContain("Focus on tests");
    expect(result.prompts).toContain("Check performance");
    expect(result.commands).toContainEqual({ type: "SKIP", storyId: "US-003" });
  });

  it("should create skip action from command list", async () => {
    const { handleSkipCommand, shouldSkip } = await import("../../src/execution/commands");

    const commands = [{ type: "SKIP" as const, storyId: "US-001" }];
    const skipNeeded = shouldSkip(commands);

    expect(skipNeeded).toBe(true);

    const action = handleSkipCommand("US-001", null);
    expect(action.type).toBe("skip");
    expect(action.storyId).toBe("US-001");
    expect(action.rejected).toBe(false);
  });

  it("should reject skip for story in progress", async () => {
    const { handleSkipCommand, shouldSkip } = await import("../../src/execution/commands");

    const commands = [{ type: "SKIP" as const, storyId: "US-001" }];
    const skipNeeded = shouldSkip(commands);

    expect(skipNeeded).toBe(true);

    // Story US-001 is in progress
    const action = handleSkipCommand("US-001", "US-001");
    expect(action.type).toBe("skip");
    expect(action.rejected).toBe(true);
  });

  it("should not skip when no SKIP command", async () => {
    const { shouldSkip } = await import("../../src/execution/commands");

    const commands = [{ type: "PAUSE" as const }];
    const skipNeeded = shouldSkip(commands);

    expect(skipNeeded).toBe(false);
  });
});

describe("SKIP Command Invalid Story", () => {
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

  it("should handle skip for invalid story ID", async () => {
    const { handleSkipCommand } = await import("../../src/execution/commands");

    // Note: Story validation happens at a higher level (in runner)
    // The command handler just creates the action object
    const action = handleSkipCommand("US-999", null);

    expect(action.type).toBe("skip");
    expect(action.storyId).toBe("US-999");
    // Invalid story handling is done at runner level
  });
});

describe("SKIP Command Full Integration", () => {
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

  it("should mark story as skipped in PRD when SKIP processed", async () => {
    // Create a PRD file
    const prdPath = join(featurePath, "prd.json");
    const prd = {
      project: "Test Project",
      branchName: "test-branch",
      description: "Test description",
      userStories: [
        {
          id: "US-001",
          title: "First Story",
          description: "First story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 1,
          passes: false,
        },
        {
          id: "US-002",
          title: "Second Story",
          description: "Second story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 2,
          passes: false,
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    // Import functions
    const { markStoryAsSkipped, loadPRD } = await import("../../src/prd/parser");
    const { getNextStory } = await import("../../src/prd/types");

    // Skip US-002
    const result = await markStoryAsSkipped(prdPath, "US-002");
    expect(result.success).toBe(true);

    // Verify US-002 is skipped in PRD
    const updatedPrd = await loadPRD(prdPath);
    const story = updatedPrd.userStories.find((s) => s.id === "US-002");
    expect(story?.skipped).toBe(true);

    // Verify getNextStory skips US-002
    const nextStory = getNextStory(updatedPrd);
    expect(nextStory?.id).toBe("US-001");
  });

  it("should log skip to progress.txt", async () => {
    // Create progress file
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

    const { logSkipToProgress } = await import("../../src/execution/commands");

    await logSkipToProgress(progressPath, "US-003", "Blocked by external API");

    const content = await Bun.file(progressPath).text();
    expect(content).toContain("## Skip Event");
    expect(content).toContain("US-003");
    expect(content).toContain("Blocked by external API");
  });

  it("should process SKIP from queue and update PRD", async () => {
    // Create PRD file
    const prdPath = join(featurePath, "prd.json");
    const prd = {
      project: "Test Project",
      branchName: "test-branch",
      description: "Test description",
      userStories: [
        {
          id: "US-001",
          title: "First Story",
          description: "First story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 1,
          passes: false,
        },
        {
          id: "US-002",
          title: "Second Story",
          description: "Second story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 2,
          passes: false,
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    // Create queue file with SKIP command
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [SKIP US-002]\n`);

    // Process queue
    const { processQueueForIteration } = await import("../../src/execution/runner");
    const queueResult = await processQueueForIteration(featurePath);

    // Verify command detected
    expect(queueResult.commands).toContainEqual({ type: "SKIP", storyId: "US-002" });

    // Import and execute skip
    const { handleSkipCommand, getSkipCommands } = await import("../../src/execution/commands");
    const { markStoryAsSkipped, loadPRD } = await import("../../src/prd/parser");

    const skipCommands = getSkipCommands(queueResult.commands);
    for (const cmd of skipCommands) {
      const action = handleSkipCommand(cmd.storyId, "US-001"); // US-001 is current
      if (!action.rejected) {
        await markStoryAsSkipped(prdPath, action.storyId);
      }
    }

    // Verify PRD was updated
    const updatedPrd = await loadPRD(prdPath);
    const story = updatedPrd.userStories.find((s) => s.id === "US-002");
    expect(story?.skipped).toBe(true);
  });
});
