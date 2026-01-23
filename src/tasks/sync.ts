/**
 * PRD ↔ Claude Tasks Sync
 *
 * Bidirectional synchronization between Relentless PRD and Claude Tasks.
 *
 * PRD → Tasks: Convert user stories to Claude Tasks for cross-session visibility
 * Tasks → PRD: Import Claude's natural planning to structured PRD format
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PRD, UserStory } from "../prd/types";
import { loadPRD, savePRD } from "../prd";
import {
  type ClaudeTask,
  type SyncResult,
  type ImportResult,
  generateTaskListId,
} from "./types";
import {
  loadTaskList,
  saveTaskList,
  getOrCreateTaskList,
} from "./tasklist";

/**
 * Convert a user story to a Claude Task
 *
 * @param story - The user story to convert
 * @returns A Claude Task representation
 */
export function storyToTask(story: UserStory): ClaudeTask {
  const now = new Date().toISOString();

  // Map PRD status to task status
  let status: ClaudeTask["status"] = "pending";
  if (story.passes) {
    status = "completed";
  } else if (story.skipped) {
    status = "completed"; // Skipped stories are considered done
  }

  // Create the task content from story details
  const content = `${story.id}: ${story.title}`;
  const activeForm = `Working on ${story.id}: ${story.title}`;

  return {
    id: story.id, // Use story ID as task ID for easy mapping
    content,
    activeForm,
    status,
    storyId: story.id,
    dependencies: story.dependencies,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Convert a Claude Task to a minimal user story
 *
 * @param task - The Claude Task to convert
 * @param index - Index for priority assignment
 * @returns A user story representation
 */
export function taskToStory(task: ClaudeTask, index: number): UserStory {
  // Parse content to extract title (if it follows our format)
  let title = task.content;
  let description = "";

  // Check if content follows "ID: Title" format
  const idMatch = task.content.match(/^([A-Z]+-\d+):\s*(.+)$/);
  if (idMatch) {
    title = idMatch[2].trim();
  }

  // Use task ID or generate one
  const id = task.storyId || task.id || `US-${String(index + 1).padStart(3, "0")}`;

  return {
    id,
    title,
    description: description || title,
    acceptanceCriteria: [], // Will need to be filled in later
    priority: index,
    passes: task.status === "completed",
    notes: "",
    dependencies: task.dependencies,
  };
}

/**
 * Sync PRD stories to Claude TaskList
 *
 * Creates or updates a TaskList with the current PRD stories.
 * This allows Claude to see and track story progress across sessions.
 *
 * @param prd - The PRD to sync from
 * @param featureName - The feature name
 * @returns Sync result with statistics
 */
export async function syncPrdToTasks(
  prd: PRD,
  featureName: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    added: 0,
    updated: 0,
    removed: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Get or create task list
    const taskList = await getOrCreateTaskList(featureName);

    // Create a map of existing tasks by storyId
    const existingTasks = new Map<string, ClaudeTask>();
    for (const task of taskList.tasks) {
      if (task.storyId) {
        existingTasks.set(task.storyId, task);
      }
    }

    // Track which stories we've processed
    const processedStoryIds = new Set<string>();

    // Sync each story
    for (const story of prd.userStories) {
      processedStoryIds.add(story.id);

      const existingTask = existingTasks.get(story.id);

      if (existingTask) {
        // Update existing task
        const newStatus = story.passes ? "completed" : "pending";
        if (existingTask.status !== newStatus) {
          existingTask.status = newStatus;
          existingTask.updatedAt = new Date().toISOString();
          result.updated++;
        }

        // Update dependencies if changed
        const existingDeps = existingTask.dependencies?.join(",") || "";
        const newDeps = story.dependencies?.join(",") || "";
        if (existingDeps !== newDeps) {
          existingTask.dependencies = story.dependencies;
          existingTask.updatedAt = new Date().toISOString();
          if (result.updated === 0 || existingTask.status === (story.passes ? "completed" : "pending")) {
            result.updated++;
          }
        }
      } else {
        // Add new task
        const newTask = storyToTask(story);
        taskList.tasks.push(newTask);
        result.added++;
      }
    }

    // Remove tasks for stories that no longer exist
    const originalLength = taskList.tasks.length;
    taskList.tasks = taskList.tasks.filter((task) => {
      if (!task.storyId) return true; // Keep non-story tasks
      return processedStoryIds.has(task.storyId);
    });
    result.removed = originalLength - taskList.tasks.length;

    // Update metadata
    taskList.metadata = {
      ...taskList.metadata,
      source: "relentless",
      lastPrdSync: new Date().toISOString(),
    };

    // Save the task list
    await saveTaskList(taskList);
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to sync PRD to tasks: ${error}`);
  }

  return result;
}

/**
 * Sync Claude TaskList back to PRD
 *
 * Updates PRD story statuses based on Claude TaskList.
 * This allows progress made in Claude to be reflected in the PRD.
 *
 * @param prdPath - Path to the PRD file
 * @param featureName - The feature name
 * @returns Sync result with statistics
 */
export async function syncTasksToPrd(
  prdPath: string,
  featureName: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    added: 0,
    updated: 0,
    removed: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Load task list
    const taskListId = generateTaskListId(featureName);
    const taskList = await loadTaskList(taskListId);

    if (!taskList) {
      result.warnings.push(`No task list found for ${featureName}`);
      return result;
    }

    // Load PRD
    if (!existsSync(prdPath)) {
      result.success = false;
      result.errors.push(`PRD file not found: ${prdPath}`);
      return result;
    }

    const prd = await loadPRD(prdPath);

    // Create a map of tasks by storyId
    const taskMap = new Map<string, ClaudeTask>();
    for (const task of taskList.tasks) {
      if (task.storyId) {
        taskMap.set(task.storyId, task);
      }
    }

    // Update story statuses based on tasks
    for (const story of prd.userStories) {
      const task = taskMap.get(story.id);

      if (task) {
        const shouldBeComplete = task.status === "completed";
        if (story.passes !== shouldBeComplete) {
          story.passes = shouldBeComplete;
          result.updated++;
        }
      }
    }

    // Save updated PRD
    if (result.updated > 0) {
      await savePRD(prd, prdPath);
    }

    // Update task list metadata
    taskList.metadata = {
      ...taskList.metadata,
      lastPrdSync: new Date().toISOString(),
      prdPath,
    };
    await saveTaskList(taskList);
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to sync tasks to PRD: ${error}`);
  }

  return result;
}

/**
 * Import Claude Tasks to create a new PRD
 *
 * Takes a Claude TaskList (from natural planning) and creates
 * a structured PRD for execution with Relentless.
 *
 * @param taskListId - The task list ID to import
 * @param featureName - The feature name for the PRD
 * @param outputDir - Directory to create the PRD in
 * @returns Import result with statistics
 */
export async function importTasksToPrd(
  taskListId: string,
  featureName: string,
  outputDir: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    storiesCreated: 0,
    errors: [],
  };

  try {
    // Load task list
    const taskList = await loadTaskList(taskListId);

    if (!taskList) {
      result.success = false;
      result.errors.push(`Task list not found: ${taskListId}`);
      return result;
    }

    // Convert tasks to stories
    const stories: UserStory[] = [];
    for (let i = 0; i < taskList.tasks.length; i++) {
      const task = taskList.tasks[i];
      const story = taskToStory(task, i);
      stories.push(story);
      result.storiesCreated++;
    }

    // Create PRD structure
    const prd: PRD = {
      project: featureName,
      branchName: `feature/${featureName.toLowerCase().replace(/\s+/g, "-")}`,
      description: taskList.name || `Imported from Claude Tasks: ${taskListId}`,
      userStories: stories,
    };

    // Determine output path
    const prdPath = join(outputDir, "prd.json");
    result.prdPath = prdPath;

    // Save PRD
    await savePRD(prd, prdPath);

    // Update task list metadata
    taskList.metadata = {
      ...taskList.metadata,
      lastPrdSync: new Date().toISOString(),
      prdPath,
    };
    await saveTaskList(taskList);
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to import tasks to PRD: ${error}`);
  }

  return result;
}

/**
 * Bidirectional sync between PRD and Claude Tasks
 *
 * Syncs in both directions, preferring the most recently updated source.
 * This ensures both PRD and Tasks stay in sync.
 *
 * @param prdPath - Path to the PRD file
 * @param featureName - The feature name
 * @returns Sync result with combined statistics
 */
export async function bidirectionalSync(
  prdPath: string,
  featureName: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    added: 0,
    updated: 0,
    removed: 0,
    errors: [],
    warnings: [],
  };

  // First sync PRD to Tasks (ensures all stories are represented)
  const prdToTasks = await syncPrdToTasks(await loadPRD(prdPath), featureName);
  result.added += prdToTasks.added;
  result.errors.push(...prdToTasks.errors);
  result.warnings.push(...prdToTasks.warnings);

  // Then sync Tasks back to PRD (pick up any Claude-made changes)
  const tasksToPrd = await syncTasksToPrd(prdPath, featureName);
  result.updated += tasksToPrd.updated;
  result.errors.push(...tasksToPrd.errors);
  result.warnings.push(...tasksToPrd.warnings);

  result.success = prdToTasks.success && tasksToPrd.success;

  return result;
}
