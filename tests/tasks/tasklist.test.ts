/**
 * Tests for Claude Code TaskList CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir } from "../helpers";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { TaskList, ClaudeTask } from "../../src/tasks/types";

// Mock the tasks directory for testing
const originalEnv = process.env.HOME;
let tempDir: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const temp = await createTempDir();
  tempDir = temp.path;
  cleanup = temp.cleanup;

  // Create mock .claude/tasks directory
  await mkdir(join(tempDir, ".claude", "tasks"), { recursive: true });

  // Override HOME to use temp directory
  process.env.HOME = tempDir;
});

afterEach(async () => {
  // Restore HOME
  process.env.HOME = originalEnv;
  await cleanup();
});

// Import after setting up the mock
async function importTaskList() {
  // Dynamic import to ensure HOME is set correctly
  return await import("../../src/tasks/tasklist");
}

describe("createTaskList", () => {
  it("should create a new task list", async () => {
    const { createTaskList, loadTaskList } = await importTaskList();

    const taskList = await createTaskList("test-feature", "Test Feature");

    expect(taskList.id).toBe("relentless-test-feature");
    expect(taskList.name).toBe("Test Feature");
    expect(taskList.featureName).toBe("test-feature");
    expect(taskList.tasks).toHaveLength(0);

    // Verify it was saved
    const loaded = await loadTaskList("relentless-test-feature");
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe("relentless-test-feature");
  });
});

describe("loadTaskList", () => {
  it("should return null for non-existent task list", async () => {
    const { loadTaskList } = await importTaskList();

    const result = await loadTaskList("non-existent");
    expect(result).toBeNull();
  });

  it("should load an existing task list", async () => {
    const { createTaskList, loadTaskList } = await importTaskList();

    await createTaskList("my-feature");

    const loaded = await loadTaskList("relentless-my-feature");
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe("relentless-my-feature");
  });
});

describe("saveTaskList", () => {
  it("should update updatedAt timestamp", async () => {
    const { createTaskList, saveTaskList, loadTaskList } = await importTaskList();

    const taskList = await createTaskList("save-test");
    const originalUpdatedAt = taskList.updatedAt;

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10));

    await saveTaskList(taskList);

    const loaded = await loadTaskList("relentless-save-test");
    expect(loaded!.updatedAt).not.toBe(originalUpdatedAt);
  });
});

describe("addTask", () => {
  it("should add a task to the list", async () => {
    const { createTaskList, addTask, loadTaskList } = await importTaskList();

    await createTaskList("add-task-test");

    const task = await addTask("relentless-add-task-test", {
      content: "Test task",
      activeForm: "Testing task",
      status: "pending",
    });

    expect(task).not.toBeNull();
    expect(task!.id).toBeTruthy();
    expect(task!.content).toBe("Test task");

    const loaded = await loadTaskList("relentless-add-task-test");
    expect(loaded!.tasks).toHaveLength(1);
  });

  it("should return null for non-existent task list", async () => {
    const { addTask } = await importTaskList();

    const task = await addTask("non-existent", {
      content: "Test",
      activeForm: "Testing",
      status: "pending",
    });

    expect(task).toBeNull();
  });
});

describe("updateTask", () => {
  it("should update an existing task", async () => {
    const { createTaskList, addTask, updateTask, loadTaskList } = await importTaskList();

    await createTaskList("update-task-test");

    const task = await addTask("relentless-update-task-test", {
      content: "Original",
      activeForm: "Original form",
      status: "pending",
    });

    const updated = await updateTask("relentless-update-task-test", task!.id, {
      status: "completed",
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("completed");

    const loaded = await loadTaskList("relentless-update-task-test");
    expect(loaded!.tasks[0].status).toBe("completed");
  });

  it("should return null for non-existent task", async () => {
    const { createTaskList, updateTask } = await importTaskList();

    await createTaskList("update-task-test-2");

    const updated = await updateTask("relentless-update-task-test-2", "non-existent", {
      status: "completed",
    });

    expect(updated).toBeNull();
  });
});

describe("markTaskComplete", () => {
  it("should mark a task as completed", async () => {
    const { createTaskList, addTask, markTaskComplete, loadTaskList } = await importTaskList();

    await createTaskList("mark-complete-test");

    const task = await addTask("relentless-mark-complete-test", {
      content: "Test",
      activeForm: "Testing",
      status: "pending",
    });

    await markTaskComplete("relentless-mark-complete-test", task!.id);

    const loaded = await loadTaskList("relentless-mark-complete-test");
    expect(loaded!.tasks[0].status).toBe("completed");
  });
});

describe("removeTask", () => {
  it("should remove a task from the list", async () => {
    const { createTaskList, addTask, removeTask, loadTaskList } = await importTaskList();

    await createTaskList("remove-task-test");

    const task = await addTask("relentless-remove-task-test", {
      content: "To remove",
      activeForm: "Removing",
      status: "pending",
    });

    const removed = await removeTask("relentless-remove-task-test", task!.id);
    expect(removed).toBe(true);

    const loaded = await loadTaskList("relentless-remove-task-test");
    expect(loaded!.tasks).toHaveLength(0);
  });

  it("should return false for non-existent task", async () => {
    const { createTaskList, removeTask } = await importTaskList();

    await createTaskList("remove-task-test-2");

    const removed = await removeTask("relentless-remove-task-test-2", "non-existent");
    expect(removed).toBe(false);
  });
});

describe("getNextTask", () => {
  it("should return the first pending task", async () => {
    const { createTaskList, addTask, getNextTask } = await importTaskList();

    await createTaskList("next-task-test");

    await addTask("relentless-next-task-test", {
      content: "First",
      activeForm: "First",
      status: "pending",
    });

    await addTask("relentless-next-task-test", {
      content: "Second",
      activeForm: "Second",
      status: "pending",
    });

    const next = await getNextTask("relentless-next-task-test");
    expect(next).not.toBeNull();
    expect(next!.content).toBe("First");
  });

  it("should respect dependencies", async () => {
    const { createTaskList, addTask, getNextTask, loadTaskList, saveTaskList } = await importTaskList();

    await createTaskList("deps-test");

    const first = await addTask("relentless-deps-test", {
      content: "First (no deps)",
      activeForm: "First",
      status: "pending",
    });

    await addTask("relentless-deps-test", {
      content: "Second (depends on first)",
      activeForm: "Second",
      status: "pending",
      dependencies: [first!.id],
    });

    // First should be returned (no deps)
    const next = await getNextTask("relentless-deps-test");
    expect(next!.content).toBe("First (no deps)");

    // Mark first complete
    const taskList = await loadTaskList("relentless-deps-test");
    taskList!.tasks[0].status = "completed";
    await saveTaskList(taskList!);

    // Now second should be returned
    const nextAfter = await getNextTask("relentless-deps-test");
    expect(nextAfter!.content).toBe("Second (depends on first)");
  });

  it("should return null when all tasks are complete", async () => {
    const { createTaskList, addTask, markTaskComplete, getNextTask } = await importTaskList();

    await createTaskList("all-complete-test");

    const task = await addTask("relentless-all-complete-test", {
      content: "Only task",
      activeForm: "Only",
      status: "pending",
    });

    await markTaskComplete("relentless-all-complete-test", task!.id);

    const next = await getNextTask("relentless-all-complete-test");
    expect(next).toBeNull();
  });
});

describe("getParallelTasks", () => {
  it("should return all tasks with no unmet dependencies", async () => {
    const { createTaskList, addTask, getParallelTasks } = await importTaskList();

    await createTaskList("parallel-test");

    await addTask("relentless-parallel-test", {
      content: "Independent 1",
      activeForm: "Ind 1",
      status: "pending",
    });

    await addTask("relentless-parallel-test", {
      content: "Independent 2",
      activeForm: "Ind 2",
      status: "pending",
    });

    const parallel = await getParallelTasks("relentless-parallel-test");
    expect(parallel).toHaveLength(2);
  });
});

describe("isTaskListComplete", () => {
  it("should return true when all tasks are complete", async () => {
    const { createTaskList, addTask, markTaskComplete, isTaskListComplete } = await importTaskList();

    await createTaskList("complete-check-test");

    const task = await addTask("relentless-complete-check-test", {
      content: "Task",
      activeForm: "Task",
      status: "pending",
    });

    await markTaskComplete("relentless-complete-check-test", task!.id);

    const isComplete = await isTaskListComplete("relentless-complete-check-test");
    expect(isComplete).toBe(true);
  });

  it("should return false when tasks are pending", async () => {
    const { createTaskList, addTask, isTaskListComplete } = await importTaskList();

    await createTaskList("incomplete-check-test");

    await addTask("relentless-incomplete-check-test", {
      content: "Task",
      activeForm: "Task",
      status: "pending",
    });

    const isComplete = await isTaskListComplete("relentless-incomplete-check-test");
    expect(isComplete).toBe(false);
  });
});

describe("clearTaskList", () => {
  it("should remove all tasks from the list", async () => {
    const { createTaskList, addTask, clearTaskList, loadTaskList } = await importTaskList();

    await createTaskList("clear-test");

    await addTask("relentless-clear-test", {
      content: "Task 1",
      activeForm: "Task 1",
      status: "pending",
    });

    await addTask("relentless-clear-test", {
      content: "Task 2",
      activeForm: "Task 2",
      status: "pending",
    });

    const cleared = await clearTaskList("relentless-clear-test");
    expect(cleared).toBe(true);

    const loaded = await loadTaskList("relentless-clear-test");
    expect(loaded!.tasks).toHaveLength(0);
  });
});

describe("deleteTaskList", () => {
  it("should delete an existing task list", async () => {
    const { createTaskList, deleteTaskList, taskListExists } = await importTaskList();

    await createTaskList("delete-test");

    expect(await taskListExists("relentless-delete-test")).toBe(true);

    const deleted = await deleteTaskList("relentless-delete-test");
    expect(deleted).toBe(true);

    expect(await taskListExists("relentless-delete-test")).toBe(false);
  });

  it("should return false for non-existent task list", async () => {
    const { deleteTaskList } = await importTaskList();

    const deleted = await deleteTaskList("non-existent");
    expect(deleted).toBe(false);
  });
});

describe("listTaskLists", () => {
  it("should list all task lists", async () => {
    const { createTaskList, listTaskLists } = await importTaskList();

    await createTaskList("feature-1");
    await createTaskList("feature-2");

    const lists = await listTaskLists();
    expect(lists).toContain("relentless-feature-1");
    expect(lists).toContain("relentless-feature-2");
  });

  it("should return empty array when no task lists exist", async () => {
    const { listTaskLists } = await importTaskList();

    const lists = await listTaskLists();
    expect(lists).toHaveLength(0);
  });
});
