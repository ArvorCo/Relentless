/**
 * PRD Skip Story Tests
 *
 * Tests for marking stories as skipped in the PRD.
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

describe("UserStory skipped field", () => {
  it("should allow skipped field in schema", async () => {
    const { UserStorySchema } = await import("../../src/prd/types");

    const result = UserStorySchema.safeParse({
      id: "US-001",
      title: "Test Story",
      description: "A test story",
      acceptanceCriteria: ["Criterion 1"],
      priority: 1,
      passes: false,
      skipped: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skipped).toBe(true);
    }
  });

  it("should default skipped to undefined if not provided", async () => {
    const { UserStorySchema } = await import("../../src/prd/types");

    const result = UserStorySchema.safeParse({
      id: "US-001",
      title: "Test Story",
      description: "A test story",
      acceptanceCriteria: ["Criterion 1"],
      priority: 1,
      passes: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skipped).toBeUndefined();
    }
  });
});

describe("getNextStory with skipped stories", () => {
  it("should skip stories marked as skipped", async () => {
    const { getNextStory } = await import("../../src/prd/types");

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
          skipped: true,
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

    const nextStory = getNextStory(prd);

    expect(nextStory).not.toBeNull();
    expect(nextStory?.id).toBe("US-002");
  });

  it("should return null when all non-completed stories are skipped", async () => {
    const { getNextStory } = await import("../../src/prd/types");

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
          passes: true,
        },
        {
          id: "US-002",
          title: "Second Story",
          description: "Second story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 2,
          passes: false,
          skipped: true,
        },
      ],
    };

    const nextStory = getNextStory(prd);

    expect(nextStory).toBeNull();
  });
});

describe("markStoryAsSkipped", () => {
  let tempDir: { path: string; cleanup: () => void };

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    tempDir.cleanup();
  });

  it("should mark a story as skipped in the PRD file", async () => {
    const prdPath = join(tempDir.path, "prd.json");
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

    const { markStoryAsSkipped, loadPRD } = await import("../../src/prd/parser");

    const result = await markStoryAsSkipped(prdPath, "US-001");

    expect(result.success).toBe(true);

    // Reload and verify
    const updatedPrd = await loadPRD(prdPath);
    const story = updatedPrd.userStories.find((s) => s.id === "US-001");
    expect(story?.skipped).toBe(true);
  });

  it("should return error for non-existent story", async () => {
    const prdPath = join(tempDir.path, "prd.json");
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

    const { markStoryAsSkipped } = await import("../../src/prd/parser");

    const result = await markStoryAsSkipped(prdPath, "US-999");

    expect(result.success).toBe(false);
    expect(result.error).toContain("US-999");
    expect(result.error).toContain("not found");
  });

  it("should not re-skip an already skipped story", async () => {
    const prdPath = join(tempDir.path, "prd.json");
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
          skipped: true,
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    const { markStoryAsSkipped } = await import("../../src/prd/parser");

    const result = await markStoryAsSkipped(prdPath, "US-001");

    expect(result.success).toBe(true);
    expect(result.alreadySkipped).toBe(true);
  });

  it("should not skip a completed story", async () => {
    const prdPath = join(tempDir.path, "prd.json");
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
          passes: true,
        },
      ],
    };
    await Bun.write(prdPath, JSON.stringify(prd, null, 2));

    const { markStoryAsSkipped } = await import("../../src/prd/parser");

    const result = await markStoryAsSkipped(prdPath, "US-001");

    expect(result.success).toBe(false);
    expect(result.error).toContain("already completed");
  });
});

describe("countStories with skipped", () => {
  it("should count skipped stories separately", async () => {
    const { countStories } = await import("../../src/prd/types");

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
          passes: true,
        },
        {
          id: "US-002",
          title: "Second Story",
          description: "Second story description",
          acceptanceCriteria: ["Criterion 1"],
          priority: 2,
          passes: false,
          skipped: true,
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

    const counts = countStories(prd);

    expect(counts.total).toBe(3);
    expect(counts.completed).toBe(1);
    expect(counts.skipped).toBe(1);
    expect(counts.pending).toBe(1);
  });
});
