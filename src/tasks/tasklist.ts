/**
 * TaskList CRUD Operations
 *
 * Read, write, and manage Claude Code TaskLists.
 * TaskLists are stored in ~/.claude/tasks/{id}.json
 */

import { existsSync, mkdirSync } from "node:fs";
import {
  type TaskList,
  type ClaudeTask,
  type TaskListSummary,
  TaskListSchema,
  getTasksDirectory,
  getTaskListPath,
  generateTaskListId,
} from "./types";

/**
 * Ensure the tasks directory exists
 */
export async function ensureTasksDirectory(): Promise<void> {
  const dir = getTasksDirectory();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Check if a task list exists
 */
export async function taskListExists(taskListId: string): Promise<boolean> {
  const path = getTaskListPath(taskListId);
  return existsSync(path);
}

/**
 * Load a task list from disk
 *
 * @param taskListId - The task list ID
 * @returns The task list or null if not found
 */
export async function loadTaskList(taskListId: string): Promise<TaskList | null> {
  const path = getTaskListPath(taskListId);

  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = await Bun.file(path).text();
    const data = JSON.parse(content);
    return TaskListSchema.parse(data);
  } catch (error) {
    console.error(`Failed to load task list ${taskListId}:`, error);
    return null;
  }
}

/**
 * Save a task list to disk
 *
 * @param taskList - The task list to save
 */
export async function saveTaskList(taskList: TaskList): Promise<void> {
  await ensureTasksDirectory();

  const path = getTaskListPath(taskList.id);

  // Update the updatedAt timestamp
  taskList.updatedAt = new Date().toISOString();

  await Bun.write(path, JSON.stringify(taskList, null, 2));
}

/**
 * Create a new task list
 *
 * @param featureName - The feature name to create a task list for
 * @param name - Optional human-readable name
 * @returns The created task list
 */
export async function createTaskList(
  featureName: string,
  name?: string
): Promise<TaskList> {
  const id = generateTaskListId(featureName);
  const now = new Date().toISOString();

  const taskList: TaskList = {
    id,
    name: name || featureName,
    featureName,
    tasks: [],
    createdAt: now,
    updatedAt: now,
    metadata: {
      source: "relentless",
    },
  };

  await saveTaskList(taskList);
  return taskList;
}

/**
 * Delete a task list
 *
 * @param taskListId - The task list ID to delete
 * @returns True if deleted, false if not found
 */
export async function deleteTaskList(taskListId: string): Promise<boolean> {
  const path = getTaskListPath(taskListId);

  if (!existsSync(path)) {
    return false;
  }

  await Bun.write(path, ""); // Clear the file
  const { unlink } = await import("node:fs/promises");
  await unlink(path);
  return true;
}

/**
 * List all task lists
 *
 * @returns Array of task list IDs
 */
export async function listTaskLists(): Promise<string[]> {
  const dir = getTasksDirectory();

  if (!existsSync(dir)) {
    return [];
  }

  const { readdir } = await import("node:fs/promises");
  const files = await readdir(dir);

  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

/**
 * Get a summary of a task list
 *
 * @param taskListId - The task list ID
 * @returns Summary or null if not found
 */
export async function getTaskListSummary(
  taskListId: string
): Promise<TaskListSummary | null> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList) {
    return null;
  }

  const pendingTasks = taskList.tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = taskList.tasks.filter((t) => t.status === "in_progress").length;
  const completedTasks = taskList.tasks.filter((t) => t.status === "completed").length;

  return {
    id: taskList.id,
    name: taskList.name,
    featureName: taskList.featureName,
    totalTasks: taskList.tasks.length,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    createdAt: taskList.createdAt,
    updatedAt: taskList.updatedAt,
  };
}

/**
 * Add a task to a task list
 *
 * @param taskListId - The task list ID
 * @param task - The task to add (without id)
 * @returns The added task with ID, or null if task list not found
 */
export async function addTask(
  taskListId: string,
  task: Omit<ClaudeTask, "id" | "createdAt" | "updatedAt">
): Promise<ClaudeTask | null> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList) {
    return null;
  }

  const now = new Date().toISOString();
  const newTask: ClaudeTask = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };

  taskList.tasks.push(newTask);
  await saveTaskList(taskList);

  return newTask;
}

/**
 * Update a task in a task list
 *
 * @param taskListId - The task list ID
 * @param taskId - The task ID to update
 * @param updates - Partial task updates
 * @returns The updated task, or null if not found
 */
export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Omit<ClaudeTask, "id" | "createdAt">>
): Promise<ClaudeTask | null> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList) {
    return null;
  }

  const taskIndex = taskList.tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) {
    return null;
  }

  const now = new Date().toISOString();
  taskList.tasks[taskIndex] = {
    ...taskList.tasks[taskIndex],
    ...updates,
    updatedAt: now,
  };

  await saveTaskList(taskList);

  return taskList.tasks[taskIndex];
}

/**
 * Remove a task from a task list
 *
 * @param taskListId - The task list ID
 * @param taskId - The task ID to remove
 * @returns True if removed, false if not found
 */
export async function removeTask(
  taskListId: string,
  taskId: string
): Promise<boolean> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList) {
    return false;
  }

  const initialLength = taskList.tasks.length;
  taskList.tasks = taskList.tasks.filter((t) => t.id !== taskId);

  if (taskList.tasks.length === initialLength) {
    return false;
  }

  await saveTaskList(taskList);
  return true;
}

/**
 * Mark a task as completed
 *
 * @param taskListId - The task list ID
 * @param taskId - The task ID to mark complete
 * @returns The updated task, or null if not found
 */
export async function markTaskComplete(
  taskListId: string,
  taskId: string
): Promise<ClaudeTask | null> {
  return updateTask(taskListId, taskId, { status: "completed" });
}

/**
 * Mark a task as in progress
 *
 * @param taskListId - The task list ID
 * @param taskId - The task ID to mark in progress
 * @returns The updated task, or null if not found
 */
export async function markTaskInProgress(
  taskListId: string,
  taskId: string
): Promise<ClaudeTask | null> {
  return updateTask(taskListId, taskId, { status: "in_progress" });
}

/**
 * Get the next pending task from a task list
 *
 * Respects dependencies - only returns tasks whose dependencies are complete.
 *
 * @param taskListId - The task list ID
 * @returns The next task to work on, or null if none available
 */
export async function getNextTask(taskListId: string): Promise<ClaudeTask | null> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList) {
    return null;
  }

  const completedIds = new Set(
    taskList.tasks.filter((t) => t.status === "completed").map((t) => t.id)
  );

  // Find first pending task with all dependencies met
  for (const task of taskList.tasks) {
    if (task.status !== "pending") {
      continue;
    }

    // Check if all dependencies are complete
    const deps = task.dependencies || [];
    const allDepsComplete = deps.every((depId) => completedIds.has(depId));

    if (allDepsComplete) {
      return task;
    }
  }

  return null;
}

/**
 * Get tasks that can run in parallel
 *
 * Returns all pending tasks whose dependencies are complete.
 *
 * @param taskListId - The task list ID
 * @returns Array of tasks that can run in parallel
 */
export async function getParallelTasks(taskListId: string): Promise<ClaudeTask[]> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList) {
    return [];
  }

  const completedIds = new Set(
    taskList.tasks.filter((t) => t.status === "completed").map((t) => t.id)
  );

  const parallelTasks: ClaudeTask[] = [];

  for (const task of taskList.tasks) {
    if (task.status !== "pending") {
      continue;
    }

    // Check if all dependencies are complete
    const deps = task.dependencies || [];
    const allDepsComplete = deps.every((depId) => completedIds.has(depId));

    if (allDepsComplete) {
      parallelTasks.push(task);
    }
  }

  return parallelTasks;
}

/**
 * Check if a task list is complete
 *
 * @param taskListId - The task list ID
 * @returns True if all tasks are complete
 */
export async function isTaskListComplete(taskListId: string): Promise<boolean> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList || taskList.tasks.length === 0) {
    return false;
  }

  return taskList.tasks.every((t) => t.status === "completed");
}

/**
 * Clear all tasks from a task list
 *
 * @param taskListId - The task list ID
 * @returns True if cleared, false if not found
 */
export async function clearTaskList(taskListId: string): Promise<boolean> {
  const taskList = await loadTaskList(taskListId);

  if (!taskList) {
    return false;
  }

  taskList.tasks = [];
  await saveTaskList(taskList);
  return true;
}

/**
 * Get or create a task list for a feature
 *
 * @param featureName - The feature name
 * @returns The task list (existing or newly created)
 */
export async function getOrCreateTaskList(featureName: string): Promise<TaskList> {
  const id = generateTaskListId(featureName);
  const existing = await loadTaskList(id);

  if (existing) {
    return existing;
  }

  return createTaskList(featureName);
}
