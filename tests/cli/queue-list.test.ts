/**
 * CLI Queue List Command Tests
 *
 * Tests for `relentless queue list` command.
 * Following TDD: Tests written first, implementation comes after.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestDir, createTestFile } from "../helpers";
import { join } from "node:path";

describe("CLI Queue List Command", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;
  let featurePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    // Create a valid Relentless project structure
    await createTestDir(tempDir.path, "relentless/features/test-feature");
    featurePath = join(tempDir.path, "relentless/features/test-feature");
    // Create required prd.json for the feature
    await createTestFile(
      featurePath,
      "prd.json",
      JSON.stringify({ project: "Test", userStories: [] })
    );
  });

  afterEach(async () => {
    if (tempDir) {
      await tempDir.cleanup();
      tempDir = null;
    }
  });

  describe("queueList function (unit tests)", () => {
    let queueList: typeof import("../../src/cli/queue").queueList;

    beforeEach(async () => {
      const module = await import("../../src/cli/queue");
      queueList = module.queueList;
    });

    it("should return empty result for empty queue", async () => {
      const result = await queueList({
        featurePath,
        showAll: false,
      });

      expect(result.success).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.pendingItems).toEqual([]);
    });

    it("should return pending items with correct structure", async () => {
      // Add items to the queue
      const timestamp = "2026-01-14T10:30:00.000Z";
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${timestamp} | Focus on error handling\n${timestamp} | Check tests\n`
      );

      const result = await queueList({
        featurePath,
        showAll: false,
      });

      expect(result.success).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.pendingItems).toHaveLength(2);
      expect(result.pendingItems[0]).toEqual({
        index: 1,
        timestamp,
        content: "Focus on error handling",
        type: "prompt",
      });
      expect(result.pendingItems[1]).toEqual({
        index: 2,
        timestamp,
        content: "Check tests",
        type: "prompt",
      });
    });

    it("should identify commands correctly", async () => {
      const timestamp = "2026-01-14T10:30:00.000Z";
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${timestamp} | [PAUSE]\n${timestamp} | [SKIP US-003]\n`
      );

      const result = await queueList({
        featurePath,
        showAll: false,
      });

      expect(result.pendingItems[0].type).toBe("command");
      expect(result.pendingItems[0].content).toBe("[PAUSE]");
      expect(result.pendingItems[1].type).toBe("command");
      expect(result.pendingItems[1].content).toBe("[SKIP US-003]");
    });

    it("should include processed items when showAll is true", async () => {
      const timestamp = "2026-01-14T10:30:00.000Z";
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${timestamp} | Pending item\n`
      );
      await createTestFile(
        featurePath,
        ".queue.processed.txt",
        `${timestamp} | Processed item\n`
      );

      const result = await queueList({
        featurePath,
        showAll: true,
      });

      expect(result.pendingItems).toHaveLength(1);
      expect(result.processedItems).toHaveLength(1);
      expect(result.processedItems[0].content).toBe("Processed item");
    });

    it("should not include processed items when showAll is false", async () => {
      const timestamp = "2026-01-14T10:30:00.000Z";
      await createTestFile(
        featurePath,
        ".queue.txt",
        `${timestamp} | Pending item\n`
      );
      await createTestFile(
        featurePath,
        ".queue.processed.txt",
        `${timestamp} | Processed item\n`
      );

      const result = await queueList({
        featurePath,
        showAll: false,
      });

      expect(result.pendingItems).toHaveLength(1);
      expect(result.processedItems).toEqual([]);
    });

    it("should fail if feature path does not exist", async () => {
      const result = await queueList({
        featurePath: "/nonexistent/path/feature",
        showAll: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("not found");
    });
  });

  describe("formatQueueList function", () => {
    let formatQueueList: typeof import("../../src/cli/queue").formatQueueList;

    beforeEach(async () => {
      const module = await import("../../src/cli/queue");
      formatQueueList = module.formatQueueList;
    });

    it("should format empty queue message", () => {
      const output = formatQueueList({
        success: true,
        isEmpty: true,
        pendingItems: [],
        processedItems: [],
        featureName: "test-feature",
      });

      expect(output).toContain("Queue is empty");
    });

    it("should include feature name in header", () => {
      const output = formatQueueList({
        success: true,
        isEmpty: false,
        pendingItems: [
          {
            index: 1,
            timestamp: "2026-01-14T10:30:00.000Z",
            content: "Test item",
            type: "prompt",
          },
        ],
        processedItems: [],
        featureName: "my-feature",
      });

      expect(output).toContain("my-feature");
    });

    it("should display items with index, timestamp, and content", () => {
      const output = formatQueueList({
        success: true,
        isEmpty: false,
        pendingItems: [
          {
            index: 1,
            timestamp: "2026-01-14T10:30:00.000Z",
            content: "First item",
            type: "prompt",
          },
          {
            index: 2,
            timestamp: "2026-01-14T11:00:00.000Z",
            content: "Second item",
            type: "prompt",
          },
        ],
        processedItems: [],
        featureName: "test-feature",
      });

      expect(output).toContain("1.");
      expect(output).toContain("2.");
      expect(output).toContain("First item");
      expect(output).toContain("Second item");
      expect(output).toContain("10:30");
    });

    it("should mark commands differently from prompts", () => {
      const output = formatQueueList({
        success: true,
        isEmpty: false,
        pendingItems: [
          {
            index: 1,
            timestamp: "2026-01-14T10:30:00.000Z",
            content: "[PAUSE]",
            type: "command",
          },
        ],
        processedItems: [],
        featureName: "test-feature",
      });

      // Commands should be visually distinct (could be bold, colored, or tagged)
      expect(output).toContain("[PAUSE]");
    });

    it("should show processed items with marker when included", () => {
      const output = formatQueueList({
        success: true,
        isEmpty: false,
        pendingItems: [],
        processedItems: [
          {
            index: 1,
            timestamp: "2026-01-14T10:30:00.000Z",
            content: "Done item",
            type: "prompt",
          },
        ],
        featureName: "test-feature",
      });

      // Processed items should be marked
      expect(output).toContain("Done item");
      // Should have some indication it's processed (e.g., "[processed]", "✓", strikethrough, or section header)
      const hasProcessedIndicator =
        output.includes("[processed]") ||
        output.includes("Processed") ||
        output.includes("✓");
      expect(hasProcessedIndicator).toBe(true);
    });

    it("should show count summary", () => {
      const output = formatQueueList({
        success: true,
        isEmpty: false,
        pendingItems: [
          {
            index: 1,
            timestamp: "2026-01-14T10:30:00.000Z",
            content: "Item 1",
            type: "prompt",
          },
          {
            index: 2,
            timestamp: "2026-01-14T10:30:00.000Z",
            content: "Item 2",
            type: "prompt",
          },
        ],
        processedItems: [],
        featureName: "test-feature",
      });

      // Should show count (e.g., "2 items" or "2 pending")
      expect(output).toMatch(/2\s*(items?|pending)/i);
    });
  });
});

describe("CLI Queue List Integration", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;

  beforeEach(async () => {
    tempDir = await createTempDir();
    // Create a valid Relentless project structure
    await createTestDir(tempDir.path, "relentless/features/my-feature");
    const featurePath = join(tempDir.path, "relentless/features/my-feature");
    await createTestFile(
      featurePath,
      "prd.json",
      JSON.stringify({ project: "Test", userStories: [] })
    );
  });

  afterEach(async () => {
    if (tempDir) {
      await tempDir.cleanup();
      tempDir = null;
    }
  });

  it("should execute queue list via CLI for empty queue", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "list",
        "--feature",
        "my-feature",
        "-d",
        tempDir!.path,
      ],
      {
        cwd: tempDir!.path,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("Queue is empty");
  });

  it("should show pending items via CLI", async () => {
    const featurePath = join(tempDir!.path, "relentless/features/my-feature");
    const timestamp = new Date().toISOString();
    await createTestFile(
      featurePath,
      ".queue.txt",
      `${timestamp} | Test message\n`
    );

    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "list",
        "--feature",
        "my-feature",
        "-d",
        tempDir!.path,
      ],
      {
        cwd: tempDir!.path,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("Test message");
    expect(output).toContain("my-feature");
  });

  it("should show error for nonexistent feature via CLI", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "list",
        "--feature",
        "nonexistent-feature",
        "-d",
        tempDir!.path,
      ],
      {
        cwd: tempDir!.path,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(stderr).toContain("not found");
  });

  it("should show all items with --all flag", async () => {
    const featurePath = join(tempDir!.path, "relentless/features/my-feature");
    const timestamp = new Date().toISOString();
    await createTestFile(
      featurePath,
      ".queue.txt",
      `${timestamp} | Pending item\n`
    );
    await createTestFile(
      featurePath,
      ".queue.processed.txt",
      `${timestamp} | Processed item\n`
    );

    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "list",
        "--feature",
        "my-feature",
        "--all",
        "-d",
        tempDir!.path,
      ],
      {
        cwd: tempDir!.path,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("Pending item");
    expect(output).toContain("Processed item");
  });

  it("should show help text for queue list", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      ["bun", "run", cliPath, "queue", "list", "--help"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("list");
    expect(output).toContain("--feature");
    expect(output).toContain("--all");
  });
});
