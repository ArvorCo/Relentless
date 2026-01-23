/**
 * Tests for Claude Code Tasks types and utilities
 */

import { describe, it, expect } from "bun:test";
import {
  generateTaskListId,
  getTasksDirectory,
  getTaskListPath,
  ClaudeTaskSchema,
  TaskListSchema,
} from "../../src/tasks/types";

describe("generateTaskListId", () => {
  it("should generate a valid task list ID from feature name", () => {
    expect(generateTaskListId("auth")).toBe("relentless-auth");
  });

  it("should convert feature name to lowercase", () => {
    expect(generateTaskListId("MyFeature")).toBe("relentless-myfeature");
  });

  it("should replace spaces with hyphens", () => {
    expect(generateTaskListId("my feature name")).toBe("relentless-my-feature-name");
  });

  it("should replace special characters with hyphens", () => {
    expect(generateTaskListId("feature@#$test")).toBe("relentless-feature-test");
  });

  it("should remove leading and trailing hyphens", () => {
    expect(generateTaskListId("--feature--")).toBe("relentless-feature");
  });

  it("should collapse multiple hyphens", () => {
    expect(generateTaskListId("my---feature")).toBe("relentless-my-feature");
  });
});

describe("getTasksDirectory", () => {
  it("should return path in home directory", () => {
    const dir = getTasksDirectory();
    expect(dir).toContain(".claude/tasks");
  });
});

describe("getTaskListPath", () => {
  it("should return correct path for task list", () => {
    const path = getTaskListPath("relentless-auth");
    expect(path).toContain(".claude/tasks/relentless-auth.json");
  });
});

describe("ClaudeTaskSchema", () => {
  it("should validate a valid task", () => {
    const task = {
      id: "task-123",
      content: "Implement login",
      activeForm: "Implementing login",
      status: "pending",
    };

    const result = ClaudeTaskSchema.safeParse(task);
    expect(result.success).toBe(true);
  });

  it("should validate a task with optional fields", () => {
    const task = {
      id: "task-123",
      content: "Implement login",
      activeForm: "Implementing login",
      status: "completed",
      storyId: "US-001",
      dependencies: ["task-100", "task-101"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = ClaudeTaskSchema.safeParse(task);
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", () => {
    const task = {
      id: "task-123",
      content: "Implement login",
      activeForm: "Implementing login",
      status: "invalid",
    };

    const result = ClaudeTaskSchema.safeParse(task);
    expect(result.success).toBe(false);
  });

  it("should reject missing required fields", () => {
    const task = {
      id: "task-123",
      // missing content, activeForm, status
    };

    const result = ClaudeTaskSchema.safeParse(task);
    expect(result.success).toBe(false);
  });
});

describe("TaskListSchema", () => {
  it("should validate a valid task list", () => {
    const taskList = {
      id: "relentless-auth",
      name: "Authentication Feature",
      featureName: "auth",
      tasks: [
        {
          id: "task-1",
          content: "Setup auth",
          activeForm: "Setting up auth",
          status: "pending",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = TaskListSchema.safeParse(taskList);
    expect(result.success).toBe(true);
  });

  it("should validate an empty task list", () => {
    const taskList = {
      id: "relentless-auth",
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = TaskListSchema.safeParse(taskList);
    expect(result.success).toBe(true);
  });

  it("should validate task list with metadata", () => {
    const taskList = {
      id: "relentless-auth",
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        source: "relentless",
        lastPrdSync: new Date().toISOString(),
        prdPath: "/path/to/prd.json",
      },
    };

    const result = TaskListSchema.safeParse(taskList);
    expect(result.success).toBe(true);
  });

  it("should reject invalid source in metadata", () => {
    const taskList = {
      id: "relentless-auth",
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        source: "invalid",
      },
    };

    const result = TaskListSchema.safeParse(taskList);
    expect(result.success).toBe(false);
  });
});
