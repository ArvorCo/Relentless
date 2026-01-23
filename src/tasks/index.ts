/**
 * Claude Code Tasks Module
 *
 * Integration with Claude Code's native Tasks feature for cross-session
 * coordination and parallel story execution.
 *
 * ## Usage
 *
 * ### Enable TaskList for a feature
 * ```bash
 * relentless run --feature auth --tasks
 * # Sets CLAUDE_CODE_TASK_LIST_ID=relentless-auth
 * ```
 *
 * ### Sync PRD to Tasks
 * ```bash
 * relentless tasks sync -f auth
 * ```
 *
 * ### Import Claude Tasks to PRD
 * ```bash
 * relentless tasks import my-task-list --feature my-feature
 * ```
 *
 * ## Key Concepts
 *
 * - **TaskList**: A collection of tasks stored in ~/.claude/tasks/{id}.json
 * - **Task**: Individual work item with status, dependencies, and story link
 * - **Sync**: Bidirectional sync between PRD stories and Claude Tasks
 *
 * @see https://docs.anthropic.com/claude-code
 */

// Types
export {
  type TaskStatus,
  type ClaudeTask,
  type TaskList,
  type TaskListSummary,
  type SyncResult,
  type ImportResult,
  ClaudeTaskSchema,
  TaskListSchema,
  generateTaskListId,
  getTasksDirectory,
  getTaskListPath,
} from "./types";

// TaskList CRUD operations
export {
  ensureTasksDirectory,
  taskListExists,
  loadTaskList,
  saveTaskList,
  createTaskList,
  deleteTaskList,
  listTaskLists,
  getTaskListSummary,
  addTask,
  updateTask,
  removeTask,
  markTaskComplete,
  markTaskInProgress,
  getNextTask,
  getParallelTasks,
  isTaskListComplete,
  clearTaskList,
  getOrCreateTaskList,
} from "./tasklist";

// PRD Sync operations
export {
  storyToTask,
  taskToStory,
  syncPrdToTasks,
  syncTasksToPrd,
  importTasksToPrd,
  bidirectionalSync,
} from "./sync";
