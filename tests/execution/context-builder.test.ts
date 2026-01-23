/**
 * Tests for Context Builder
 *
 * TDD tests for the task-specific context extraction module
 * that optimizes token usage in relentless run prompts.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestFile } from "../helpers";
import type { PRD, UserStory } from "../../src/prd/types";

// Import the module we're testing (will implement after tests)
import {
  extractStoryFromTasks,
  filterChecklistForStory,
  extractStoryMetadata,
  buildProgressSummary,
  type StoryContext,
  type FilteredChecklist,
  type StoryMetadata,
} from "../../src/execution/context-builder";

describe("Context Builder", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  // Sample PRD for testing
  const samplePRD: PRD = {
    project: "Test Project",
    branchName: "test-feature",
    description: "Test feature description",
    userStories: [
      {
        id: "US-001",
        title: "Test Infrastructure",
        description: "Set up test infrastructure",
        acceptanceCriteria: ["Tests run", "Coverage works"],
        priority: 1,
        passes: true,
        notes: "",
        phase: "Setup",
      },
      {
        id: "US-002",
        title: "Queue Parser",
        description: "Implement queue parser",
        acceptanceCriteria: ["Parse lines", "Parse commands", "Handle errors"],
        priority: 2,
        passes: false,
        notes: "",
        dependencies: ["US-001"],
        phase: "Foundation",
      },
      {
        id: "US-003",
        title: "Queue Writer",
        description: "Implement queue writer",
        acceptanceCriteria: ["Add items", "Remove items"],
        priority: 3,
        passes: false,
        notes: "",
        dependencies: ["US-002"],
        phase: "Foundation",
      },
      {
        id: "US-004",
        title: "CLI Commands",
        description: "Add CLI commands",
        acceptanceCriteria: ["Add command", "List command"],
        priority: 4,
        passes: false,
        notes: "",
        dependencies: ["US-002", "US-003"],
        phase: "Stories",
      },
    ],
  };

  // Sample tasks.md content
  const sampleTasksContent = `# User Stories: Test Feature

**Feature Branch**: \`test-feature\`
**Project**: Test Project

---

## Phase 0: Setup

### US-001: Test Infrastructure

**Description:** Set up test infrastructure

**Acceptance Criteria:**
- [x] Tests run
- [x] Coverage works

**Dependencies:** None
**Phase:** Setup
**Priority:** 1

---

## Phase 1: Foundation

### US-002: Queue Parser

**Description:** Implement queue parser

**Acceptance Criteria:**
- [ ] Parse lines
- [ ] Parse commands
- [ ] Handle errors

**Dependencies:** US-001
**Phase:** Foundation
**Priority:** 2

---

### US-003: Queue Writer

**Description:** Implement queue writer

**Acceptance Criteria:**
- [ ] Add items
- [ ] Remove items

**Dependencies:** US-002
**Phase:** Foundation
**Priority:** 3

---

## Phase 2: Stories

### US-004: CLI Commands

**Description:** Add CLI commands

**Acceptance Criteria:**
- [ ] Add command
- [ ] List command

**Dependencies:** US-002, US-003
**Phase:** Stories
**Priority:** 4

---

## Summary

| Metric | Value |
|--------|-------|
| Total Stories | 4 |
`;

  // Sample checklist.md content
  const sampleChecklistContent = `# Quality Checklist: Test Feature

---

## Test Infrastructure

- [x] CHK-001 [US-001] Tests run successfully
- [x] CHK-002 [US-001] Coverage report works
- [ ] CHK-003 [Constitution] TDD workflow followed

---

## Queue Parser

- [ ] CHK-004 [US-002] Parse queue lines correctly
- [ ] CHK-005 [US-002] Parse commands correctly
- [ ] CHK-006 [US-002] Handle errors gracefully
- [ ] CHK-007 [Edge Case] Unicode characters handled

---

## Queue Writer

- [ ] CHK-008 [US-003] Add items to queue
- [ ] CHK-009 [US-003] Remove items from queue
- [ ] CHK-010 [Constitution] Atomic writes used

---

## CLI Commands

- [ ] CHK-011 [US-004] Add command works
- [ ] CHK-012 [US-004] List command works
- [ ] CHK-013 [Gap] Help text provided

---

## Summary

| Category | Items |
|----------|-------|
| Total | 13 |
`;

  describe("extractStoryFromTasks", () => {
    it("should extract the current story section from tasks.md", async () => {
      const tasksPath = await createTestFile(tempDir.path, "tasks.md", sampleTasksContent);

      const result = await extractStoryFromTasks(tasksPath, "US-002", samplePRD);

      expect(result).toBeDefined();
      expect(result.currentStory).toContain("### US-002: Queue Parser");
      expect(result.currentStory).toContain("Parse lines");
      expect(result.currentStory).toContain("Parse commands");
      expect(result.currentStory).toContain("Handle errors");
    });

    it("should include dependency story sections", async () => {
      const tasksPath = await createTestFile(tempDir.path, "tasks.md", sampleTasksContent);

      const result = await extractStoryFromTasks(tasksPath, "US-004", samplePRD);

      expect(result).toBeDefined();
      expect(result.currentStory).toContain("### US-004: CLI Commands");
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies.some((d) => d.includes("US-002"))).toBe(true);
      expect(result.dependencies.some((d) => d.includes("US-003"))).toBe(true);
    });

    it("should return correct progress stats", async () => {
      const tasksPath = await createTestFile(tempDir.path, "tasks.md", sampleTasksContent);

      const result = await extractStoryFromTasks(tasksPath, "US-002", samplePRD);

      expect(result.stats.total).toBe(4);
      expect(result.stats.completed).toBe(1);
      expect(result.stats.pending).toBe(3);
    });

    it("should generate progress summary", async () => {
      const tasksPath = await createTestFile(tempDir.path, "tasks.md", sampleTasksContent);

      const result = await extractStoryFromTasks(tasksPath, "US-002", samplePRD);

      expect(result.progressSummary).toContain("1/4");
      expect(result.progressSummary).toContain("complete");
    });

    it("should handle story with no dependencies", async () => {
      const tasksPath = await createTestFile(tempDir.path, "tasks.md", sampleTasksContent);

      const result = await extractStoryFromTasks(tasksPath, "US-001", samplePRD);

      expect(result.dependencies).toHaveLength(0);
      expect(result.currentStory).toContain("### US-001: Test Infrastructure");
    });

    it("should return null for non-existent story", async () => {
      const tasksPath = await createTestFile(tempDir.path, "tasks.md", sampleTasksContent);

      const result = await extractStoryFromTasks(tasksPath, "US-999", samplePRD);

      expect(result.currentStory).toBe("");
    });

    it("should handle missing tasks.md gracefully", async () => {
      const nonExistentPath = `${tempDir.path}/nonexistent/tasks.md`;

      const result = await extractStoryFromTasks(nonExistentPath, "US-001", samplePRD);

      expect(result.currentStory).toBe("");
      expect(result.dependencies).toHaveLength(0);
    });
  });

  describe("filterChecklistForStory", () => {
    it("should filter checklist items by story ID", async () => {
      const checklistPath = await createTestFile(tempDir.path, "checklist.md", sampleChecklistContent);

      const result = await filterChecklistForStory(checklistPath, "US-002");

      expect(result.storyItems).toHaveLength(3);
      expect(result.storyItems.every((item) => item.includes("[US-002]"))).toBe(true);
    });

    it("should include Constitution items", async () => {
      const checklistPath = await createTestFile(tempDir.path, "checklist.md", sampleChecklistContent);

      const result = await filterChecklistForStory(checklistPath, "US-002");

      expect(result.constitutionItems.length).toBeGreaterThan(0);
      expect(result.constitutionItems.every((item) => item.includes("[Constitution]"))).toBe(true);
    });

    it("should include Edge Case items", async () => {
      const checklistPath = await createTestFile(tempDir.path, "checklist.md", sampleChecklistContent);

      const result = await filterChecklistForStory(checklistPath, "US-002");

      expect(result.generalItems.some((item) => item.includes("[Edge Case]"))).toBe(true);
    });

    it("should include Gap items", async () => {
      const checklistPath = await createTestFile(tempDir.path, "checklist.md", sampleChecklistContent);

      const result = await filterChecklistForStory(checklistPath, "US-004");

      expect(result.generalItems.some((item) => item.includes("[Gap]"))).toBe(true);
    });

    it("should report total item count", async () => {
      const checklistPath = await createTestFile(tempDir.path, "checklist.md", sampleChecklistContent);

      const result = await filterChecklistForStory(checklistPath, "US-002");

      expect(result.totalItemCount).toBe(13);
    });

    it("should return empty arrays for missing checklist", async () => {
      const nonExistentPath = `${tempDir.path}/nonexistent/checklist.md`;

      const result = await filterChecklistForStory(nonExistentPath, "US-002");

      expect(result.storyItems).toHaveLength(0);
      expect(result.constitutionItems).toHaveLength(0);
      expect(result.generalItems).toHaveLength(0);
      expect(result.totalItemCount).toBe(0);
    });

    it("should return empty for story with no items", async () => {
      const checklistPath = await createTestFile(tempDir.path, "checklist.md", sampleChecklistContent);

      const result = await filterChecklistForStory(checklistPath, "US-999");

      expect(result.storyItems).toHaveLength(0);
      // Constitution and general items should still be included
      expect(result.constitutionItems.length).toBeGreaterThan(0);
    });
  });

  describe("extractStoryMetadata", () => {
    it("should extract metadata for a specific story", () => {
      const result = extractStoryMetadata(samplePRD, "US-002");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("US-002");
      expect(result?.title).toBe("Queue Parser");
      expect(result?.description).toBe("Implement queue parser");
      expect(result?.acceptanceCriteria).toHaveLength(3);
      expect(result?.priority).toBe(2);
      expect(result?.dependencies).toEqual(["US-001"]);
      expect(result?.phase).toBe("Foundation");
    });

    it("should return null for non-existent story", () => {
      const result = extractStoryMetadata(samplePRD, "US-999");

      expect(result).toBeNull();
    });

    it("should handle story with no dependencies", () => {
      const result = extractStoryMetadata(samplePRD, "US-001");

      expect(result).not.toBeNull();
      expect(result?.dependencies).toEqual([]);
    });

    it("should include research flag if present", () => {
      const prdWithResearch: PRD = {
        ...samplePRD,
        userStories: [
          ...samplePRD.userStories,
          {
            id: "US-005",
            title: "Research Story",
            description: "Needs research",
            acceptanceCriteria: ["Research done"],
            priority: 5,
            passes: false,
            notes: "",
            research: true,
          },
        ],
      };

      const result = extractStoryMetadata(prdWithResearch, "US-005");

      expect(result?.research).toBe(true);
    });
  });

  describe("buildProgressSummary", () => {
    it("should build a concise progress summary", () => {
      const result = buildProgressSummary(samplePRD);

      expect(result).toContain("1/4");
      expect(result).toContain("complete");
    });

    it("should handle empty PRD", () => {
      const emptyPRD: PRD = {
        project: "Empty",
        branchName: "empty",
        description: "Empty",
        userStories: [],
      };

      const result = buildProgressSummary(emptyPRD);

      expect(result).toContain("0/0");
    });

    it("should handle all completed PRD", () => {
      const completedPRD: PRD = {
        ...samplePRD,
        userStories: samplePRD.userStories.map((s) => ({ ...s, passes: true })),
      };

      const result = buildProgressSummary(completedPRD);

      expect(result).toContain("4/4");
      expect(result).toContain("complete");
    });
  });

  describe("Token Optimization", () => {
    it("should extract significantly less content than full file", async () => {
      // Create a large tasks.md with many stories
      const largeTasksContent = generateLargeTasksContent(20);
      const tasksPath = await createTestFile(tempDir.path, "tasks.md", largeTasksContent);

      // Also create corresponding PRD
      const largePRD = generateLargePRD(20);

      const result = await extractStoryFromTasks(tasksPath, "US-005", largePRD);

      // Current story + dependencies should be much smaller than full file
      const fullFileLength = largeTasksContent.length;
      const extractedLength = result.currentStory.length +
        result.dependencies.reduce((sum, d) => sum + d.length, 0);

      // Extracted content should be less than 30% of full file for 20 stories
      expect(extractedLength).toBeLessThan(fullFileLength * 0.3);
    });

    it("should filter checklist to relevant items only", async () => {
      // Create a large checklist with many items
      const largeChecklistContent = generateLargeChecklistContent(20);
      const checklistPath = await createTestFile(tempDir.path, "checklist.md", largeChecklistContent);

      const result = await filterChecklistForStory(checklistPath, "US-005");

      // Filtered items should be much fewer than total
      const relevantCount =
        result.storyItems.length +
        result.constitutionItems.length +
        result.generalItems.length;

      // Should have fewer relevant items than total
      expect(relevantCount).toBeLessThan(result.totalItemCount);
    });
  });
});

// Helper functions for generating test data

function generateLargeTasksContent(storyCount: number): string {
  let content = `# User Stories: Large Feature

**Feature Branch**: \`large-feature\`
**Project**: Large Project

---

`;

  for (let i = 1; i <= storyCount; i++) {
    const deps = i > 1 ? `US-${String(i - 1).padStart(3, "0")}` : "None";
    content += `
### US-${String(i).padStart(3, "0")}: Story ${i}

**Description:** Description for story ${i}

**Acceptance Criteria:**
- [ ] Criterion 1 for story ${i}
- [ ] Criterion 2 for story ${i}
- [ ] Criterion 3 for story ${i}

**Dependencies:** ${deps}
**Phase:** Phase ${Math.ceil(i / 5)}
**Priority:** ${i}

---
`;
  }

  return content;
}

function generateLargePRD(storyCount: number): PRD {
  const stories: UserStory[] = [];

  for (let i = 1; i <= storyCount; i++) {
    stories.push({
      id: `US-${String(i).padStart(3, "0")}`,
      title: `Story ${i}`,
      description: `Description for story ${i}`,
      acceptanceCriteria: [
        `Criterion 1 for story ${i}`,
        `Criterion 2 for story ${i}`,
        `Criterion 3 for story ${i}`,
      ],
      priority: i,
      passes: i <= 3, // First 3 stories completed
      notes: "",
      dependencies: i > 1 ? [`US-${String(i - 1).padStart(3, "0")}`] : undefined,
      phase: `Phase ${Math.ceil(i / 5)}`,
    });
  }

  return {
    project: "Large Project",
    branchName: "large-feature",
    description: "Large feature description",
    userStories: stories,
  };
}

function generateLargeChecklistContent(storyCount: number): string {
  let content = `# Quality Checklist: Large Feature

---

`;

  let itemNum = 1;

  for (let i = 1; i <= storyCount; i++) {
    const storyId = `US-${String(i).padStart(3, "0")}`;
    content += `
## Story ${i}

- [ ] CHK-${String(itemNum++).padStart(3, "0")} [${storyId}] Item 1 for ${storyId}
- [ ] CHK-${String(itemNum++).padStart(3, "0")} [${storyId}] Item 2 for ${storyId}
- [ ] CHK-${String(itemNum++).padStart(3, "0")} [${storyId}] Item 3 for ${storyId}
`;

    // Add some constitution and edge case items
    if (i % 5 === 0) {
      content += `- [ ] CHK-${String(itemNum++).padStart(3, "0")} [Constitution] TDD followed\n`;
      content += `- [ ] CHK-${String(itemNum++).padStart(3, "0")} [Edge Case] Error handling\n`;
      content += `- [ ] CHK-${String(itemNum++).padStart(3, "0")} [Gap] Documentation needed\n`;
    }

    content += "\n---\n";
  }

  return content;
}
