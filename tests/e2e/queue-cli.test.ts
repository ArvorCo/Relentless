/**
 * E2E Tests for Queue CLI Commands
 *
 * End-to-end tests that verify the full queue system workflow
 * from CLI commands through to agent prompt integration.
 *
 * User Story: US-018 - E2E Tests for Queue System
 *
 * These tests use the actual CLI binary and verify:
 * - Queue add creates file and adds items
 * - Queue list shows items correctly
 * - Queue remove removes the correct item
 * - Queue clear removes all items
 * - Queue items appear in agent prompt
 * - Commands (PAUSE, ABORT) execute correctly
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import {
  createTempDir,
  createTestDir,
  createTestFile,
  readTestFile,
} from "../helpers";

// Path to CLI binary
const CLI_PATH = join(import.meta.dir, "../../bin/relentless.ts");

/**
 * Helper to execute CLI command and return result
 */
async function runCli(
  args: string[],
  options: { cwd?: string; stdin?: string } = {}
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
    stdin: options.stdin ? "pipe" : undefined,
  });

  if (options.stdin && proc.stdin) {
    proc.stdin.write(options.stdin);
    proc.stdin.end();
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

describe("E2E: Queue CLI Commands", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> };
  let featurePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    // Create a valid Relentless project structure
    await createTestDir(tempDir.path, "relentless/features/e2e-test-feature");
    featurePath = join(
      tempDir.path,
      "relentless/features/e2e-test-feature"
    );
    // Create required prd.json for the feature
    await createTestFile(
      featurePath,
      "prd.json",
      JSON.stringify({
        project: "E2E Test Feature",
        branchName: "e2e-test",
        userStories: [
          {
            id: "US-001",
            title: "Test Story",
            description: "A test story for E2E tests",
            acceptanceCriteria: ["Criterion 1"],
            priority: 1,
            passes: false,
            dependencies: [],
            phase: "Test",
          },
          {
            id: "US-002",
            title: "Second Story",
            description: "A second test story",
            acceptanceCriteria: ["Criterion 2"],
            priority: 2,
            passes: false,
            dependencies: ["US-001"],
            phase: "Test",
          },
        ],
      })
    );
    // Create progress.txt for the feature
    await createTestFile(
      featurePath,
      "progress.txt",
      `---
feature: e2e-test-feature
created: 2026-01-14
status: in_progress
stories_total: 2
stories_completed: 0
last_updated: 2026-01-14
---

# Progress Log: E2E Test Feature

`
    );
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  describe("E2E: Queue Add", () => {
    it("creates .queue.txt file and adds item with timestamp", async () => {
      // Execute CLI command
      const result = await runCli(
        [
          "queue",
          "add",
          "Focus on error handling",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Verify CLI output
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Added to queue");
      expect(result.stdout).toContain("Focus on error handling");

      // Verify file was created with correct content
      const queueFile = join(featurePath, ".queue.txt");
      const content = await readTestFile(queueFile);

      // Should have timestamp | content format
      expect(content).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| Focus on error handling\n$/
      );
    });

    it("appends multiple items to existing queue file", async () => {
      // Add first item
      await runCli(
        [
          "queue",
          "add",
          "First message",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Add second item
      await runCli(
        [
          "queue",
          "add",
          "Second message",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Add third item
      await runCli(
        [
          "queue",
          "add",
          "Third message",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Verify all items are in the file
      const queueFile = join(featurePath, ".queue.txt");
      const content = await readTestFile(queueFile);

      expect(content).toContain("First message");
      expect(content).toContain("Second message");
      expect(content).toContain("Third message");

      // Verify FIFO order (first item first)
      const lines = content.trim().split("\n");
      expect(lines.length).toBe(3);
      expect(lines[0]).toContain("First message");
      expect(lines[1]).toContain("Second message");
      expect(lines[2]).toContain("Third message");
    });

    it("adds structured commands to queue", async () => {
      // Add PAUSE command
      const result = await runCli(
        [
          "queue",
          "add",
          "[PAUSE]",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("[PAUSE]");

      // Verify file content
      const queueFile = join(featurePath, ".queue.txt");
      const content = await readTestFile(queueFile);
      expect(content).toContain("[PAUSE]");
    });

    it("adds command with argument to queue", async () => {
      // Add SKIP command with story ID
      const result = await runCli(
        [
          "queue",
          "add",
          "[SKIP US-001]",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("[SKIP US-001]");

      // Verify file content
      const queueFile = join(featurePath, ".queue.txt");
      const content = await readTestFile(queueFile);
      expect(content).toContain("[SKIP US-001]");
    });

    it("returns error for non-existent feature", async () => {
      const result = await runCli(
        [
          "queue",
          "add",
          "Test message",
          "--feature",
          "nonexistent-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });
  });

  describe("E2E: Queue List", () => {
    it("shows pending items with index and content", async () => {
      // Add items to queue first
      await runCli(
        [
          "queue",
          "add",
          "First task",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      await runCli(
        [
          "queue",
          "add",
          "Second task",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // List queue
      const result = await runCli(
        [
          "queue",
          "list",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("First task");
      expect(result.stdout).toContain("Second task");
      // Should show item count
      expect(result.stdout).toMatch(/2\s*items?/i);
    });

    it("shows 'Queue is empty' for empty queue", async () => {
      const result = await runCli(
        [
          "queue",
          "list",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Queue is empty");
    });

    it("shows feature name in header", async () => {
      const result = await runCli(
        [
          "queue",
          "list",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("e2e-test-feature");
    });

    it("shows processed items with --all flag", async () => {
      // Add and process items
      const { addToQueue, processQueue } = await import("../../src/queue");
      await addToQueue(featurePath, "Processed item");
      await processQueue(featurePath);

      // Add a new pending item
      await addToQueue(featurePath, "Pending item");

      // List with --all flag
      const result = await runCli(
        [
          "queue",
          "list",
          "--feature",
          "e2e-test-feature",
          "--all",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Pending item");
      expect(result.stdout).toContain("Processed item");
      // Should indicate processed status
      expect(result.stdout.toLowerCase()).toMatch(/processed|✓/);
    });

    it("identifies commands with [cmd] indicator", async () => {
      // Add a command to queue
      await runCli(
        [
          "queue",
          "add",
          "[PAUSE]",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      const result = await runCli(
        [
          "queue",
          "list",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("[PAUSE]");
      // Should indicate it's a command
      expect(result.stdout.toLowerCase()).toMatch(/cmd|command/);
    });
  });

  describe("E2E: Queue Remove", () => {
    it("removes item by correct 1-based index", async () => {
      // Add multiple items
      await runCli(
        [
          "queue",
          "add",
          "First",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      await runCli(
        [
          "queue",
          "add",
          "Second",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      await runCli(
        [
          "queue",
          "add",
          "Third",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Remove second item (index 2)
      const result = await runCli(
        [
          "queue",
          "remove",
          "2",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Removed");
      expect(result.stdout).toContain("Second");

      // Verify queue file content
      const queueFile = join(featurePath, ".queue.txt");
      const content = await readTestFile(queueFile);
      expect(content).toContain("First");
      expect(content).not.toContain("Second");
      expect(content).toContain("Third");
    });

    it("shows error for invalid index", async () => {
      // Add one item
      await runCli(
        [
          "queue",
          "add",
          "Only item",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Try to remove non-existent index
      const result = await runCli(
        [
          "queue",
          "remove",
          "5",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid index");
      expect(result.stderr).toContain("5");
    });

    it("shows error for empty queue", async () => {
      const result = await runCli(
        [
          "queue",
          "remove",
          "1",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain("empty");
    });
  });

  describe("E2E: Queue Clear", () => {
    it("removes all items from queue", async () => {
      // Add multiple items
      await runCli(
        [
          "queue",
          "add",
          "First",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      await runCli(
        [
          "queue",
          "add",
          "Second",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      await runCli(
        [
          "queue",
          "add",
          "Third",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Clear queue
      const result = await runCli(
        [
          "queue",
          "clear",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Cleared");
      expect(result.stdout).toContain("3");

      // Verify queue is empty
      const queueFile = join(featurePath, ".queue.txt");
      const content = await readTestFile(queueFile);
      expect(content.trim()).toBe("");
    });

    it("shows message for already empty queue", async () => {
      const result = await runCli(
        [
          "queue",
          "clear",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toMatch(/empty|0\s*items?/);
    });
  });

  describe("E2E: Queue Items in Agent Prompt", () => {
    it("queue prompts are injected into agent context", async () => {
      // Add items to queue
      const { addToQueue, processQueue } = await import("../../src/queue");
      const { injectQueuePrompts } = await import("../../src/execution/runner");

      await addToQueue(featurePath, "Focus on error handling");
      await addToQueue(featurePath, "Run tests after each change");

      // Process queue (as the runner would)
      const queueResult = await processQueue(featurePath);

      // Verify prompts are extracted
      expect(queueResult.prompts).toContain("Focus on error handling");
      expect(queueResult.prompts).toContain("Run tests after each change");

      // Verify injection into agent prompt
      const basePrompt = "You are an AI agent working on a feature.";
      const finalPrompt = injectQueuePrompts(basePrompt, queueResult.prompts);

      expect(finalPrompt).toContain("## Queued User Guidance");
      expect(finalPrompt).toContain("Focus on error handling");
      expect(finalPrompt).toContain("Run tests after each change");
      expect(finalPrompt).toContain("1. Focus on error handling");
      expect(finalPrompt).toContain("2. Run tests after each change");
    });

    it("queue acknowledgment is logged to progress.txt", async () => {
      // Add items to queue
      const { addToQueue } = await import("../../src/queue");
      const { acknowledgeQueueInProgress } = await import(
        "../../src/execution/runner"
      );

      await addToQueue(featurePath, "Important guidance");

      // Acknowledge queue (as the runner would)
      const progressPath = join(featurePath, "progress.txt");
      await acknowledgeQueueInProgress(progressPath, ["Important guidance"]);

      // Verify acknowledgment in progress.txt
      const progressContent = await readTestFile(progressPath);

      expect(progressContent).toContain("## Queue Processed");
      expect(progressContent).toContain("Important guidance");
    });

    it("commands are separated from prompts in processing", async () => {
      const { addToQueue, processQueue } = await import("../../src/queue");

      await addToQueue(featurePath, "Regular prompt message");
      await addToQueue(featurePath, "[PAUSE]");
      await addToQueue(featurePath, "Another prompt");
      await addToQueue(featurePath, "[SKIP US-001]");

      const result = await processQueue(featurePath);

      // Prompts should only contain text prompts
      expect(result.prompts).toContain("Regular prompt message");
      expect(result.prompts).toContain("Another prompt");
      expect(result.prompts).not.toContain("[PAUSE]");
      expect(result.prompts).not.toContain("[SKIP US-001]");

      // Commands should be parsed
      expect(result.commands.length).toBe(2);
      expect(result.commands[0].type).toBe("PAUSE");
      expect(result.commands[1].type).toBe("SKIP");
      expect(result.commands[1].storyId).toBe("US-001");
    });
  });

  describe("E2E: Command Execution", () => {
    it("PAUSE command is detected and handled correctly", async () => {
      const { addToQueue, processQueue } = await import("../../src/queue");
      const {
        shouldPause,
        handlePauseCommand,
        logPauseToProgress,
        formatPauseMessage,
      } = await import("../../src/execution/commands");

      // Add PAUSE command to queue
      await addToQueue(featurePath, "[PAUSE]");

      // Process queue
      const queueResult = await processQueue(featurePath);

      // Verify PAUSE is detected
      expect(shouldPause(queueResult.commands)).toBe(true);

      // Verify pause action creation
      const pauseAction = handlePauseCommand();
      expect(pauseAction.type).toBe("pause");
      expect(pauseAction.message).toContain("Press Enter to continue");

      // Verify formatting
      const message = formatPauseMessage(false);
      expect(message).toContain("Paused by user");

      // Verify logging (we can test this doesn't throw)
      const progressPath = join(featurePath, "progress.txt");
      await logPauseToProgress(progressPath);
      const progressContent = await readTestFile(progressPath);
      expect(progressContent).toContain("Pause Event");
    });

    it("ABORT command is detected and returns exit code 0", async () => {
      const { addToQueue, processQueue } = await import("../../src/queue");
      const {
        shouldAbort,
        handleAbortCommand,
        logAbortToProgress,
        formatAbortMessage,
        generateAbortSummary,
      } = await import("../../src/execution/commands");

      // Add ABORT command to queue
      await addToQueue(featurePath, "[ABORT]");

      // Process queue
      const queueResult = await processQueue(featurePath);

      // Verify ABORT is detected
      expect(shouldAbort(queueResult.commands)).toBe(true);

      // Verify abort action creation with exit code 0
      const abortAction = handleAbortCommand();
      expect(abortAction.type).toBe("abort");
      expect(abortAction.exitCode).toBe(0); // Clean exit
      expect(abortAction.reason).toContain("User requested abort");

      // Verify formatting
      const message = formatAbortMessage(false);
      expect(message).toContain("Aborted by user");

      // Verify summary generation
      const summary = generateAbortSummary({
        storiesCompleted: 2,
        storiesTotal: 5,
        iterations: 3,
        duration: 125000,
      });
      expect(summary).toContain("2/5");
      expect(summary).toContain("Iterations: 3");
      expect(summary).toContain("2m 5s");

      // Verify logging
      const progressPath = join(featurePath, "progress.txt");
      await logAbortToProgress(progressPath);
      const progressContent = await readTestFile(progressPath);
      expect(progressContent).toContain("Abort Event");
      expect(progressContent).toContain("exit code 0");
    });

    it("SKIP command with story ID is processed correctly", async () => {
      const { addToQueue, processQueue } = await import("../../src/queue");
      const {
        shouldSkip,
        getSkipCommands,
        handleSkipCommand,
        logSkipToProgress,
        formatSkipMessage,
      } = await import("../../src/execution/commands");

      // Add SKIP command to queue
      await addToQueue(featurePath, "[SKIP US-002]");

      // Process queue
      const queueResult = await processQueue(featurePath);

      // Verify SKIP is detected
      expect(shouldSkip(queueResult.commands)).toBe(true);

      // Verify skip commands extraction
      const skipCommands = getSkipCommands(queueResult.commands);
      expect(skipCommands.length).toBe(1);
      expect(skipCommands[0].storyId).toBe("US-002");

      // Verify skip action (not current story)
      const skipAction = handleSkipCommand("US-002", null);
      expect(skipAction.type).toBe("skip");
      expect(skipAction.storyId).toBe("US-002");
      expect(skipAction.rejected).toBe(false);

      // Verify skip rejection when story is in progress
      const rejectedAction = handleSkipCommand("US-002", "US-002");
      expect(rejectedAction.rejected).toBe(true);
      expect(rejectedAction.reason).toContain("currently in progress");

      // Verify formatting
      const message = formatSkipMessage("US-002", false);
      expect(message).toContain("Skipped US-002");

      // Verify logging
      const progressPath = join(featurePath, "progress.txt");
      await logSkipToProgress(progressPath, "US-002");
      const progressContent = await readTestFile(progressPath);
      expect(progressContent).toContain("Skip Event");
      expect(progressContent).toContain("US-002");
    });

    it("PRIORITY command changes story priority", async () => {
      const { addToQueue, processQueue } = await import("../../src/queue");
      const {
        shouldPrioritize,
        getPriorityCommands,
        handlePriorityCommand,
        logPriorityToProgress,
        formatPriorityMessage,
      } = await import("../../src/execution/commands");

      // Add PRIORITY command to queue
      await addToQueue(featurePath, "[PRIORITY US-002]");

      // Process queue
      const queueResult = await processQueue(featurePath);

      // Verify PRIORITY is detected
      expect(shouldPrioritize(queueResult.commands)).toBe(true);

      // Verify priority commands extraction
      const priorityCommands = getPriorityCommands(queueResult.commands);
      expect(priorityCommands.length).toBe(1);
      expect(priorityCommands[0].storyId).toBe("US-002");

      // Verify priority action (not current story)
      const priorityAction = handlePriorityCommand("US-002", null);
      expect(priorityAction.type).toBe("priority");
      expect(priorityAction.storyId).toBe("US-002");
      expect(priorityAction.isCurrentStory).toBe(false);

      // Verify info when story is already current
      const currentAction = handlePriorityCommand("US-002", "US-002");
      expect(currentAction.isCurrentStory).toBe(true);
      expect(currentAction.message).toContain("already in progress");

      // Verify formatting
      const message = formatPriorityMessage("US-002", false);
      expect(message).toContain("Prioritized US-002");

      // Verify logging
      const progressPath = join(featurePath, "progress.txt");
      await logPriorityToProgress(progressPath, "US-002");
      const progressContent = await readTestFile(progressPath);
      expect(progressContent).toContain("Priority Change");
      expect(progressContent).toContain("US-002");
    });
  });

  describe("E2E: Full Workflow", () => {
    it("complete workflow: add, list, process, verify", async () => {
      const { loadQueue, processQueue } = await import("../../src/queue");
      const { injectQueuePrompts, acknowledgeQueueInProgress } = await import(
        "../../src/execution/runner"
      );

      // Step 1: Add items via CLI
      await runCli(
        [
          "queue",
          "add",
          "Check edge cases",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      await runCli(
        [
          "queue",
          "add",
          "[PAUSE]",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Step 2: List queue via CLI
      const listResult = await runCli(
        [
          "queue",
          "list",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      expect(listResult.stdout).toContain("Check edge cases");
      expect(listResult.stdout).toContain("[PAUSE]");

      // Step 3: Load queue state
      const state = await loadQueue(featurePath);
      expect(state.pending.length).toBe(2);

      // Step 4: Process queue (as runner would)
      const processResult = await processQueue(featurePath);
      expect(processResult.prompts).toContain("Check edge cases");
      expect(processResult.commands.length).toBe(1);
      expect(processResult.commands[0].type).toBe("PAUSE");

      // Step 5: Inject into prompt
      const prompt = injectQueuePrompts("Base prompt.", processResult.prompts);
      expect(prompt).toContain("Check edge cases");

      // Step 6: Acknowledge in progress
      const progressPath = join(featurePath, "progress.txt");
      await acknowledgeQueueInProgress(progressPath, processResult.prompts);
      const progressContent = await readTestFile(progressPath);
      expect(progressContent).toContain("Queue Processed");

      // Step 7: Verify queue is now empty
      const finalList = await runCli(
        [
          "queue",
          "list",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      expect(finalList.stdout).toContain("Queue is empty");

      // Step 8: Verify processed items with --all
      const allList = await runCli(
        [
          "queue",
          "list",
          "--all",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );
      expect(allList.stdout).toContain("Check edge cases");
      expect(allList.stdout).toContain("[PAUSE]");
    });

    it("handles multiple commands in single queue", async () => {
      const { addToQueue, processQueue } = await import("../../src/queue");
      const { shouldPause, shouldAbort, shouldSkip, shouldPrioritize } =
        await import("../../src/execution/commands");

      // Add multiple commands
      await addToQueue(featurePath, "[PRIORITY US-002]");
      await addToQueue(featurePath, "[SKIP US-001]");
      await addToQueue(featurePath, "Focus on tests");
      await addToQueue(featurePath, "[PAUSE]");

      // Process queue
      const result = await processQueue(featurePath);

      // All commands should be detected
      expect(shouldPrioritize(result.commands)).toBe(true);
      expect(shouldSkip(result.commands)).toBe(true);
      expect(shouldPause(result.commands)).toBe(true);
      expect(shouldAbort(result.commands)).toBe(false);

      // Prompts should be separate
      expect(result.prompts).toContain("Focus on tests");
      expect(result.prompts.length).toBe(1);

      // Commands should be in order
      expect(result.commands.length).toBe(3);
    });
  });

  describe("E2E: Cleanup", () => {
    it("tests clean up after themselves (temp directories)", async () => {
      // Verify we're using temp directory
      expect(tempDir.path).toContain("relentless-test");

      // Add some files
      await runCli(
        [
          "queue",
          "add",
          "Test",
          "--feature",
          "e2e-test-feature",
          "-d",
          tempDir.path,
        ],
        { cwd: tempDir.path }
      );

      // Verify file exists
      const queueFile = Bun.file(join(featurePath, ".queue.txt"));
      expect(await queueFile.exists()).toBe(true);

      // Note: cleanup happens in afterEach, this test just verifies
      // we're creating files in the temp directory correctly
    });
  });
});
