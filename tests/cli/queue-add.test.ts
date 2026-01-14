/**
 * CLI Queue Add Command Tests
 *
 * Tests for `relentless queue add` command.
 * Following TDD: Tests written first, implementation comes after.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, createTestDir, createTestFile } from "../helpers";
import { join } from "node:path";

describe("CLI Queue Add Command", () => {
  let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;
  let featurePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    // Create a valid Relentless project structure
    await createTestDir(tempDir.path, "relentless/features/test-feature");
    featurePath = join(
      tempDir.path,
      "relentless/features/test-feature"
    );
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

  describe("queueAdd function (unit tests)", () => {
    let queueAdd: typeof import("../../src/cli/queue").queueAdd;

    beforeEach(async () => {
      const module = await import("../../src/cli/queue");
      queueAdd = module.queueAdd;
    });

    it("should add a message to the queue", async () => {
      const result = await queueAdd({
        message: "Focus on error handling",
        featurePath,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Added to queue");
    });

    it("should return the added message content in the result", async () => {
      const message = "Please prioritize US-003";
      const result = await queueAdd({
        message,
        featurePath,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain(message);
    });

    it("should create .queue.txt file if it does not exist", async () => {
      await queueAdd({
        message: "Test message",
        featurePath,
      });

      const queueFile = Bun.file(join(featurePath, ".queue.txt"));
      expect(await queueFile.exists()).toBe(true);
    });

    it("should append message with timestamp to queue file", async () => {
      await queueAdd({
        message: "Test message",
        featurePath,
      });

      const content = await Bun.file(join(featurePath, ".queue.txt")).text();
      // Should have timestamp | content format
      expect(content).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| Test message\n$/
      );
    });

    it("should support adding command syntax", async () => {
      const result = await queueAdd({
        message: "[PAUSE]",
        featurePath,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("[PAUSE]");

      const content = await Bun.file(join(featurePath, ".queue.txt")).text();
      expect(content).toContain("[PAUSE]");
    });

    it("should support adding command with argument", async () => {
      const result = await queueAdd({
        message: "[SKIP US-005]",
        featurePath,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("[SKIP US-005]");

      const content = await Bun.file(join(featurePath, ".queue.txt")).text();
      expect(content).toContain("[SKIP US-005]");
    });

    it("should fail if feature path does not exist", async () => {
      const result = await queueAdd({
        message: "Test message",
        featurePath: "/nonexistent/path/feature",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should fail with descriptive error for missing feature", async () => {
      const result = await queueAdd({
        message: "Test message",
        featurePath: join(tempDir!.path, "relentless/features/nonexistent"),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("resolveFeaturePath function", () => {
    let resolveFeaturePath: typeof import("../../src/cli/queue").resolveFeaturePath;

    beforeEach(async () => {
      const module = await import("../../src/cli/queue");
      resolveFeaturePath = module.resolveFeaturePath;
    });

    it("should return feature path if it exists", async () => {
      const result = await resolveFeaturePath(tempDir!.path, "test-feature");

      expect(result.path).toBe(featurePath);
      expect(result.error).toBeUndefined();
    });

    it("should return error if feature does not exist", async () => {
      const result = await resolveFeaturePath(tempDir!.path, "nonexistent");

      expect(result.path).toBeUndefined();
      expect(result.error).toContain("Feature 'nonexistent' not found");
    });

    it("should return error if relentless is not initialized", async () => {
      const emptyDir = await createTempDir();
      try {
        const result = await resolveFeaturePath(emptyDir.path, "any-feature");

        expect(result.path).toBeUndefined();
        expect(result.error).toContain("not initialized");
      } finally {
        await emptyDir.cleanup();
      }
    });
  });
});

describe("CLI Queue Add Integration", () => {
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

  it("should execute queue add via CLI", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "add",
        "Test message from CLI",
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
    expect(output).toContain("Added to queue");
  });

  it("should show error for nonexistent feature via CLI", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "add",
        "Test message",
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

  it("should support adding commands via CLI", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "queue",
        "add",
        "[PAUSE]",
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
    expect(output).toContain("Added to queue");
    expect(output).toContain("[PAUSE]");
  });

  it("should show help text for queue add", async () => {
    const cliPath = join(import.meta.dir, "../../bin/relentless.ts");
    const proc = Bun.spawn(
      ["bun", "run", cliPath, "queue", "add", "--help"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("add");
    expect(output).toContain("--feature");
  });
});
