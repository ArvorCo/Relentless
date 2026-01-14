/**
 * CLI Queue Remove Command Tests
 *
 * Tests for `relentless queue remove` and `relentless queue clear` commands.
 * Following TDD: Tests written first, implementation comes after.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestDir, createTestFile } from "../helpers";
import { join } from "node:path";

describe("CLI Queue Remove Command", () => {
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

  describe("queueRemove function (unit tests)", () => {
    let queueRemove: typeof import("../../src/cli/queue").queueRemove;
    let addToQueue: typeof import("../../src/queue").addToQueue;

    beforeEach(async () => {
      const cliModule = await import("../../src/cli/queue");
      queueRemove = cliModule.queueRemove;
      const queueModule = await import("../../src/queue");
      addToQueue = queueModule.addToQueue;
    });

    it("should remove an item by 1-based index", async () => {
      // Add items first
      await addToQueue(featurePath, "First message");
      await addToQueue(featurePath, "Second message");
      await addToQueue(featurePath, "Third message");

      const result = await queueRemove({
        index: 2,
        featurePath,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Removed");
      expect(result.removedContent).toBe("Second message");
    });

    it("should return correct confirmation message", async () => {
      await addToQueue(featurePath, "Test message");

      const result = await queueRemove({
        index: 1,
        featurePath,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Removed: Test message");
    });

    it("should fail with error for invalid index (too high)", async () => {
      await addToQueue(featurePath, "Only item");

      const result = await queueRemove({
        index: 5,
        featurePath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid index: 5");
      expect(result.error).toContain("Queue has 1 item");
    });

    it("should fail with error for invalid index (zero)", async () => {
      await addToQueue(featurePath, "Only item");

      const result = await queueRemove({
        index: 0,
        featurePath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid index");
    });

    it("should fail with error for negative index", async () => {
      await addToQueue(featurePath, "Only item");

      const result = await queueRemove({
        index: -1,
        featurePath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid index");
    });

    it("should fail with error for empty queue", async () => {
      const result = await queueRemove({
        index: 1,
        featurePath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Queue is empty");
    });

    it("should fail if feature path does not exist", async () => {
      const result = await queueRemove({
        index: 1,
        featurePath: "/nonexistent/path/feature",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle pluralization correctly (1 item vs N items)", async () => {
      await addToQueue(featurePath, "First");
      await addToQueue(featurePath, "Second");
      await addToQueue(featurePath, "Third");

      const result = await queueRemove({
        index: 10,
        featurePath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Queue has 3 items");
    });

    it("should update queue file correctly after removal", async () => {
      await addToQueue(featurePath, "First");
      await addToQueue(featurePath, "Second");
      await addToQueue(featurePath, "Third");

      await queueRemove({ index: 2, featurePath });

      const content = await Bun.file(join(featurePath, ".queue.txt")).text();
      expect(content).toContain("First");
      expect(content).not.toContain("Second");
      expect(content).toContain("Third");
    });
  });

  describe("queueClear function (unit tests)", () => {
    let queueClear: typeof import("../../src/cli/queue").queueClear;
    let addToQueue: typeof import("../../src/queue").addToQueue;

    beforeEach(async () => {
      const cliModule = await import("../../src/cli/queue");
      queueClear = cliModule.queueClear;
      const queueModule = await import("../../src/queue");
      addToQueue = queueModule.addToQueue;
    });

    it("should clear all items from queue", async () => {
      await addToQueue(featurePath, "First");
      await addToQueue(featurePath, "Second");
      await addToQueue(featurePath, "Third");

      const result = await queueClear({ featurePath });

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(3);
    });

    it("should return correct confirmation message", async () => {
      await addToQueue(featurePath, "First");
      await addToQueue(featurePath, "Second");

      const result = await queueClear({ featurePath });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Cleared 2 items from queue");
    });

    it("should handle singular correctly (1 item)", async () => {
      await addToQueue(featurePath, "Only item");

      const result = await queueClear({ featurePath });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Cleared 1 item from queue");
    });

    it("should handle empty queue gracefully", async () => {
      const result = await queueClear({ featurePath });

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
      expect(result.message).toContain("Queue is already empty");
    });

    it("should fail if feature path does not exist", async () => {
      const result = await queueClear({
        featurePath: "/nonexistent/path/feature",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should empty the queue file", async () => {
      await addToQueue(featurePath, "First");
      await addToQueue(featurePath, "Second");

      await queueClear({ featurePath });

      const content = await Bun.file(join(featurePath, ".queue.txt")).text();
      expect(content.trim()).toBe("");
    });
  });
});

describe("CLI Queue Remove Integration", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;
  let featurePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await createTestDir(tempDir.path, "relentless/features/my-feature");
    featurePath = join(tempDir.path, "relentless/features/my-feature");
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

  it("should execute queue remove via CLI", async () => {
    // Add an item first
    const { addToQueue } = await import("../../src/queue");
    await addToQueue(featurePath, "Test message");

    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "remove",
        "1",
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
    expect(output).toContain("Removed");
  });

  it("should show error for invalid index via CLI", async () => {
    // Add an item first so we can test invalid index (not empty queue)
    const { addToQueue } = await import("../../src/queue");
    await addToQueue(featurePath, "First item");

    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "remove",
        "5",
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

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Invalid index: 5");
  });

  it("should execute queue clear via CLI", async () => {
    // Add items first
    const { addToQueue } = await import("../../src/queue");
    await addToQueue(featurePath, "First");
    await addToQueue(featurePath, "Second");

    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "clear",
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
    expect(output).toContain("Cleared");
    expect(output).toContain("2 items");
  });

  it("should show help text for queue remove", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      ["bun", "run", cliPath, "queue", "remove", "--help"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("remove");
    expect(output).toContain("--feature");
  });

  it("should show help text for queue clear", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      ["bun", "run", cliPath, "queue", "clear", "--help"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("clear");
    expect(output).toContain("--feature");
  });
});
