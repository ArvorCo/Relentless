/**
 * Runner PRIORITY Command Tests
 *
 * Tests for the PRIORITY command execution in the runner.
 * Verifies that stories can be prioritized to become the next to work on.
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

describe("PRIORITY Command Detection", () => {
  describe("shouldPrioritize", () => {
    it("should detect PRIORITY command in command list", async () => {
      const { shouldPrioritize } = await import("../../src/execution/commands");

      const commands = [{ type: "PRIORITY" as const, storyId: "US-001" }];
      const result = shouldPrioritize(commands);

      expect(result).toBe(true);
    });

    it("should return false when no PRIORITY command", async () => {
      const { shouldPrioritize } = await import("../../src/execution/commands");

      const commands = [{ type: "PAUSE" as const }];
      const result = shouldPrioritize(commands);

      expect(result).toBe(false);
    });

    it("should return false for empty command list", async () => {
      const { shouldPrioritize } = await import("../../src/execution/commands");

      const commands: Array<{ type: "PAUSE" | "ABORT" | "SKIP" | "PRIORITY"; storyId?: string }> = [];
      const result = shouldPrioritize(commands);

      expect(result).toBe(false);
    });
  });

  describe("getPriorityCommands", () => {
    it("should return all PRIORITY commands with story IDs", async () => {
      const { getPriorityCommands } = await import("../../src/execution/commands");

      const commands = [
        { type: "PRIORITY" as const, storyId: "US-003" },
        { type: "PAUSE" as const },
        { type: "PRIORITY" as const, storyId: "US-005" },
      ];
      const result = getPriorityCommands(commands);

      expect(result).toHaveLength(2);
      expect(result[0].storyId).toBe("US-003");
      expect(result[1].storyId).toBe("US-005");
    });

    it("should return empty array when no PRIORITY commands", async () => {
      const { getPriorityCommands } = await import("../../src/execution/commands");

      const commands = [{ type: "PAUSE" as const }];
      const result = getPriorityCommands(commands);

      expect(result).toHaveLength(0);
    });
  });
});

describe("PRIORITY Command Handler", () => {
  describe("handlePriorityCommand", () => {
    it("should return a priority action object when story not current", async () => {
      const { handlePriorityCommand } = await import("../../src/execution/commands");

      const action = handlePriorityCommand("US-003", "US-001");

      expect(action).toBeDefined();
      expect(action.type).toBe("priority");
      expect(action.storyId).toBe("US-003");
      expect(action.isCurrentStory).toBe(false);
    });

    it("should flag when trying to prioritize the current story", async () => {
      const { handlePriorityCommand } = await import("../../src/execution/commands");

      const action = handlePriorityCommand("US-001", "US-001");

      expect(action.type).toBe("priority");
      expect(action.storyId).toBe("US-001");
      expect(action.isCurrentStory).toBe(true);
      expect(action.message).toContain("already in progress");
    });

    it("should handle null current story", async () => {
      const { handlePriorityCommand } = await import("../../src/execution/commands");

      const action = handlePriorityCommand("US-003", null);

      expect(action.type).toBe("priority");
      expect(action.storyId).toBe("US-003");
      expect(action.isCurrentStory).toBe(false);
    });

    it("should include custom reason when provided", async () => {
      const { handlePriorityCommand } = await import("../../src/execution/commands");

      const action = handlePriorityCommand("US-003", null, "User requested immediate focus on this story");

      expect(action.customReason).toBe("User requested immediate focus on this story");
    });
  });
});

describe("PRIORITY Progress Logging", () => {
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

  describe("logPriorityToProgress", () => {
    it("should log priority event to progress.txt", async () => {
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

      const { logPriorityToProgress } = await import("../../src/execution/commands");

      await logPriorityToProgress(progressPath, "US-003");

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("## Priority Change");
      expect(content).toContain("US-003");
    });

    it("should include timestamp in priority log", async () => {
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

      const { logPriorityToProgress } = await import("../../src/execution/commands");

      await logPriorityToProgress(progressPath, "US-003");

      const content = await Bun.file(progressPath).text();
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("should log priority with custom reason", async () => {
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

      const { logPriorityToProgress } = await import("../../src/execution/commands");

      await logPriorityToProgress(progressPath, "US-003", "Urgent requirement from stakeholder");

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("Urgent requirement from stakeholder");
    });

    it("should log info message when story is current", async () => {
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

      const { logPriorityInfoToProgress } = await import("../../src/execution/commands");

      await logPriorityInfoToProgress(progressPath, "US-001");

      const content = await Bun.file(progressPath).text();
      expect(content).toContain("Priority Info");
      expect(content).toContain("US-001");
      expect(content).toContain("already in progress");
    });
  });
});

describe("PRIORITY Message Formatting", () => {
  describe("formatPriorityMessage", () => {
    it("should format priority message for display", async () => {
      const { formatPriorityMessage } = await import("../../src/execution/commands");

      const message = formatPriorityMessage("US-003", false);

      expect(message).toContain("Prioritized");
      expect(message).toContain("US-003");
    });

    it("should format info message when story is current", async () => {
      const { formatPriorityMessage } = await import("../../src/execution/commands");

      const message = formatPriorityMessage("US-001", true);

      expect(message).toContain("US-001");
      expect(message).toContain("already in progress");
    });

    it("should format priority message for TUI mode", async () => {
      const { formatPriorityMessage } = await import("../../src/execution/commands");

      const message = formatPriorityMessage("US-003", false, true);

      expect(message).toContain("Prioritized");
      expect(message).toBeDefined();
    });
  });
});

describe("PRIORITY Command Integration", () => {
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

  it("should detect PRIORITY command from queue", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [PRIORITY US-003]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "PRIORITY", storyId: "US-003" });
  });

  it("should handle PRIORITY command case-insensitively", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [priority US-005]\n`);

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    expect(result.commands).toContainEqual({ type: "PRIORITY", storyId: "US-005" });
  });

  it("should process PRIORITY alongside prompts", async () => {
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(
      queuePath,
      `${timestamp} | Focus on tests\n${timestamp} | [PRIORITY US-003]\n${timestamp} | Check performance\n`
    );

    const { processQueueForIteration } = await import("../../src/execution/runner");

    const result = await processQueueForIteration(featurePath);

    // Should have both prompts and the priority command
    expect(result.prompts).toContain("Focus on tests");
    expect(result.prompts).toContain("Check performance");
    expect(result.commands).toContainEqual({ type: "PRIORITY", storyId: "US-003" });
  });

  it("should create priority action from command list", async () => {
    const { handlePriorityCommand, shouldPrioritize } = await import("../../src/execution/commands");

    const commands = [{ type: "PRIORITY" as const, storyId: "US-003" }];
    const priorityNeeded = shouldPrioritize(commands);

    expect(priorityNeeded).toBe(true);

    const action = handlePriorityCommand("US-003", "US-001"); // US-001 is current
    expect(action.type).toBe("priority");
    expect(action.storyId).toBe("US-003");
    expect(action.isCurrentStory).toBe(false);
  });

  it("should handle priority for current story with info message", async () => {
    const { handlePriorityCommand, shouldPrioritize } = await import("../../src/execution/commands");

    const commands = [{ type: "PRIORITY" as const, storyId: "US-001" }];
    const priorityNeeded = shouldPrioritize(commands);

    expect(priorityNeeded).toBe(true);

    // Story US-001 is current
    const action = handlePriorityCommand("US-001", "US-001");
    expect(action.type).toBe("priority");
    expect(action.isCurrentStory).toBe(true);
  });

  it("should not prioritize when no PRIORITY command", async () => {
    const { shouldPrioritize } = await import("../../src/execution/commands");

    const commands = [{ type: "PAUSE" as const }];
    const priorityNeeded = shouldPrioritize(commands);

    expect(priorityNeeded).toBe(false);
  });
});

describe("PRIORITY PRD Functions", () => {
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

  it("should prioritize a story in PRD", async () => {
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
        {
          id: "US-003",
          title: "Third Story",
          description: "Third story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 3,
          passes: false,
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    const { prioritizeStory, loadPRD } = await import("../../src/prd/parser");
    const { getNextStory } = await import("../../src/prd/types");

    // Prioritize US-003
    const result = await prioritizeStory(prdPath, "US-003");
    expect(result.success).toBe(true);

    // Verify US-003 now has priority 0 (before all others)
    const updatedPrd = await loadPRD(prdPath);
    const story = updatedPrd.userStories.find((s) => s.id === "US-003");
    expect(story?.priority).toBe(0);

    // Verify getNextStory returns US-003 first
    const nextStory = getNextStory(updatedPrd);
    expect(nextStory?.id).toBe("US-003");
  });

  it("should return error for non-existent story", async () => {
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
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    const { prioritizeStory } = await import("../../src/prd/parser");

    const result = await prioritizeStory(prdPath, "US-999");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should return error for completed story", async () => {
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
          passes: true, // Already completed
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    const { prioritizeStory } = await import("../../src/prd/parser");

    const result = await prioritizeStory(prdPath, "US-001");
    expect(result.success).toBe(false);
    expect(result.error).toContain("completed");
  });

  it("should return error for skipped story", async () => {
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
          skipped: true, // Already skipped
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    const { prioritizeStory } = await import("../../src/prd/parser");

    const result = await prioritizeStory(prdPath, "US-001");
    expect(result.success).toBe(false);
    expect(result.error).toContain("skipped");
  });

  it("should log priority to progress.txt", async () => {
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

    const { logPriorityToProgress } = await import("../../src/execution/commands");

    await logPriorityToProgress(progressPath, "US-003", "Urgent business requirement");

    const content = await Bun.file(progressPath).text();
    expect(content).toContain("## Priority Change");
    expect(content).toContain("US-003");
    expect(content).toContain("Urgent business requirement");
  });

  it("should process PRIORITY from queue and update PRD", async () => {
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
        {
          id: "US-003",
          title: "Third Story",
          description: "Third story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 3,
          passes: false,
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    // Create queue file with PRIORITY command
    const queuePath = join(featurePath, ".queue.txt");
    const timestamp = new Date().toISOString();
    await Bun.write(queuePath, `${timestamp} | [PRIORITY US-003]\n`);

    // Process queue
    const { processQueueForIteration } = await import("../../src/execution/runner");
    const queueResult = await processQueueForIteration(featurePath);

    // Verify command detected
    expect(queueResult.commands).toContainEqual({ type: "PRIORITY", storyId: "US-003" });

    // Import and execute priority
    const { handlePriorityCommand, getPriorityCommands } = await import("../../src/execution/commands");
    const { prioritizeStory, loadPRD } = await import("../../src/prd/parser");
    const { getNextStory } = await import("../../src/prd/types");

    const priorityCommands = getPriorityCommands(queueResult.commands);
    for (const cmd of priorityCommands) {
      const action = handlePriorityCommand(cmd.storyId, "US-001"); // US-001 is current
      if (!action.isCurrentStory) {
        await prioritizeStory(prdPath, action.storyId);
      }
    }

    // Verify PRD was updated and US-003 is now next
    const updatedPrd = await loadPRD(prdPath);
    const nextStory = getNextStory(updatedPrd);
    expect(nextStory?.id).toBe("US-003");
  });
});
