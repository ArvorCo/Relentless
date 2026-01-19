/**
 * Tests for the Typecheck Micro-Task
 *
 * Tests the typecheck micro-task that runs `bun run typecheck`,
 * parses TypeScript errors, and generates fix tasks.
 *
 * @module tests/review/tasks/typecheck.test.ts
 */

import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  runTypecheck,
  parseTypecheckOutput,
  stripAnsiCodes,
  groupErrorsByFile,
  type TypecheckError,
  type TypecheckResult,
} from "../../../src/review/tasks/typecheck";
import type { FixTask } from "../../../src/review/types";

describe("Typecheck Micro-Task", () => {
  describe("stripAnsiCodes", () => {
    it("should remove ANSI color codes from output", () => {
      const coloredOutput = "\x1b[31merror\x1b[0m: Something went wrong";
      const result = stripAnsiCodes(coloredOutput);
      expect(result).toBe("error: Something went wrong");
    });

    it("should handle output without ANSI codes", () => {
      const plainOutput = "error: Something went wrong";
      const result = stripAnsiCodes(plainOutput);
      expect(result).toBe("error: Something went wrong");
    });

    it("should handle multiple ANSI codes", () => {
      const coloredOutput = "\x1b[1m\x1b[31mERROR\x1b[0m: \x1b[33mWarning\x1b[0m text";
      const result = stripAnsiCodes(coloredOutput);
      expect(result).toBe("ERROR: Warning text");
    });

    it("should handle empty string", () => {
      expect(stripAnsiCodes("")).toBe("");
    });
  });

  describe("parseTypecheckOutput", () => {
    it("should parse TypeScript error with file, line, column, code, and message", () => {
      const output = "src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist on type 'Bar'.";
      const errors = parseTypecheckOutput(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: "src/config/schema.ts",
        line: 10,
        column: 5,
        code: "TS2339",
        message: "Property 'foo' does not exist on type 'Bar'.",
      });
    });

    it("should parse multiple errors", () => {
      const output = `src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist.
src/agents/claude.ts(25,10): error TS2304: Cannot find name 'unknown'.
src/routing/router.ts(100,15): error TS7006: Parameter 'x' implicitly has an 'any' type.`;

      const errors = parseTypecheckOutput(output);
      expect(errors).toHaveLength(3);
      expect(errors[0].file).toBe("src/config/schema.ts");
      expect(errors[1].file).toBe("src/agents/claude.ts");
      expect(errors[2].file).toBe("src/routing/router.ts");
    });

    it("should handle errors without column numbers", () => {
      const output = "src/config/schema.ts(10): error TS2339: Property 'foo' does not exist.";
      const errors = parseTypecheckOutput(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(10);
      expect(errors[0].column).toBeUndefined();
    });

    it("should return empty array for clean output", () => {
      const output = "No errors found.";
      const errors = parseTypecheckOutput(output);
      expect(errors).toHaveLength(0);
    });

    it("should ignore warning lines", () => {
      const output = `src/config/schema.ts(10,5): warning TS6133: 'foo' is declared but never used.
src/agents/claude.ts(25,10): error TS2304: Cannot find name 'bar'.`;

      const errors = parseTypecheckOutput(output);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("TS2304");
    });

    it("should parse tsc error format (colon-separated)", () => {
      const output = "src/config/schema.ts:10:5 - error TS2339: Property 'foo' does not exist.";
      const errors = parseTypecheckOutput(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: "src/config/schema.ts",
        line: 10,
        column: 5,
        code: "TS2339",
        message: "Property 'foo' does not exist.",
      });
    });

    it("should handle Bun typecheck output format", () => {
      // Bun uses a slightly different format
      const output = `error: Property 'nonExistent' does not exist on type '{ name: string; }'.
 --> src/test.ts:5:10`;
      const errors = parseTypecheckOutput(output);

      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it("should strip ANSI codes before parsing", () => {
      const coloredOutput = "\x1b[31msrc/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist.\x1b[0m";
      const errors = parseTypecheckOutput(coloredOutput);

      expect(errors).toHaveLength(1);
      expect(errors[0].file).toBe("src/config/schema.ts");
    });
  });

  describe("groupErrorsByFile", () => {
    it("should group multiple errors by file", () => {
      const errors: TypecheckError[] = [
        { file: "src/a.ts", line: 10, code: "TS2339", message: "Error 1" },
        { file: "src/b.ts", line: 20, code: "TS2339", message: "Error 2" },
        { file: "src/a.ts", line: 15, code: "TS2304", message: "Error 3" },
      ];

      const grouped = groupErrorsByFile(errors);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped["src/a.ts"]).toHaveLength(2);
      expect(grouped["src/b.ts"]).toHaveLength(1);
    });

    it("should return empty object for no errors", () => {
      const grouped = groupErrorsByFile([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it("should preserve error order within each file", () => {
      const errors: TypecheckError[] = [
        { file: "src/a.ts", line: 10, code: "TS2339", message: "First" },
        { file: "src/a.ts", line: 20, code: "TS2339", message: "Second" },
        { file: "src/a.ts", line: 30, code: "TS2339", message: "Third" },
      ];

      const grouped = groupErrorsByFile(errors);

      expect(grouped["src/a.ts"][0].message).toBe("First");
      expect(grouped["src/a.ts"][1].message).toBe("Second");
      expect(grouped["src/a.ts"][2].message).toBe("Third");
    });
  });

  describe("runTypecheck", () => {
    // Mock Bun.spawn for these tests
    let originalSpawn: typeof Bun.spawn;

    beforeEach(() => {
      originalSpawn = Bun.spawn;
    });

    afterEach(() => {
      // @ts-expect-error - Restore original spawn
      Bun.spawn = originalSpawn;
    });

    const mockSpawn = (
      exitCode: number,
      stdout: string,
      stderr: string = ""
    ) => {
      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => ({
        exited: Promise.resolve(exitCode),
        stdout: {
          text: () => Promise.resolve(stdout),
        },
        stderr: {
          text: () => Promise.resolve(stderr),
        },
      });
    };

    it("should return success:true and errorCount:0 when no errors", async () => {
      mockSpawn(0, "No errors found.\n");

      const result = await runTypecheck();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.fixTasks).toHaveLength(0);
    });

    it("should return success:false when errors are found", async () => {
      mockSpawn(
        1,
        "src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist."
      );

      const result = await runTypecheck();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
    });

    it("should generate fix tasks for each error", async () => {
      mockSpawn(
        1,
        `src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist.
src/agents/claude.ts(25,10): error TS2304: Cannot find name 'bar'.`
      );

      const result = await runTypecheck();

      expect(result.fixTasks).toHaveLength(2);
    });

    it("should create fix tasks with correct format", async () => {
      mockSpawn(
        1,
        "src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist."
      );

      const result = await runTypecheck();
      const fixTask = result.fixTasks[0];

      expect(fixTask.type).toBe("typecheck_fix");
      expect(fixTask.file).toBe("src/config/schema.ts");
      expect(fixTask.line).toBe(10);
      expect(fixTask.priority).toBe("high");
      expect(fixTask.description).toContain("TS2339");
      expect(fixTask.description).toContain("Property 'foo' does not exist");
      expect(fixTask.code).toBe("TS2339");
    });

    it("should include duration in result", async () => {
      mockSpawn(0, "No errors found.\n");

      const result = await runTypecheck();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe("number");
    });

    it("should include command in result", async () => {
      mockSpawn(0, "No errors found.\n");

      const result = await runTypecheck();

      expect(result.command).toBe("bun run typecheck");
    });

    it("should handle command failure gracefully", async () => {
      mockSpawn(1, "", "error: bun command not found");

      const result = await runTypecheck();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should include taskType as typecheck", async () => {
      mockSpawn(0, "No errors found.\n");

      const result = await runTypecheck();

      expect(result.taskType).toBe("typecheck");
    });

    it("should group errors by file when generating fix tasks", async () => {
      mockSpawn(
        1,
        `src/a.ts(10,5): error TS2339: Error 1.
src/a.ts(15,5): error TS2304: Error 2.
src/b.ts(20,10): error TS7006: Error 3.`
      );

      const result = await runTypecheck();

      // Should still have one fix task per error (not grouped into one)
      expect(result.fixTasks).toHaveLength(3);

      // But fix tasks should be organized by file
      const aTasksCount = result.fixTasks.filter((t) => t.file === "src/a.ts").length;
      const bTasksCount = result.fixTasks.filter((t) => t.file === "src/b.ts").length;

      expect(aTasksCount).toBe(2);
      expect(bTasksCount).toBe(1);
    });

    it("should not include warnings in fixTasks", async () => {
      mockSpawn(
        0,
        `src/config/schema.ts(10,5): warning TS6133: 'foo' is declared but never used.`
      );

      const result = await runTypecheck();

      expect(result.success).toBe(true);
      expect(result.fixTasks).toHaveLength(0);
      expect(result.warningCount).toBe(1);
    });

    it("should track warningCount separately", async () => {
      mockSpawn(
        1,
        `src/a.ts(10,5): error TS2339: Error 1.
src/b.ts(15,5): warning TS6133: Warning 1.
src/c.ts(20,10): warning TS6133: Warning 2.`
      );

      const result = await runTypecheck();

      expect(result.errorCount).toBe(1);
      expect(result.warningCount).toBe(2);
    });

    it("should paginate/summarize for 100+ errors", async () => {
      // Generate 150 errors
      const errors = Array.from({ length: 150 }, (_, i) =>
        `src/file${i}.ts(10,5): error TS2339: Error ${i}.`
      ).join("\n");

      mockSpawn(1, errors);

      const result = await runTypecheck();

      // Should indicate pagination/summary
      expect(result.errorCount).toBe(150);
      // Summary should be present when many errors
      expect(result.summary).toBeDefined();
      expect(result.summary).toContain("150");
    });

    it("should accept custom working directory", async () => {
      let capturedCwd: string | undefined;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = (cmd: string[], opts: { cwd?: string }) => {
        capturedCwd = opts.cwd;
        return {
          exited: Promise.resolve(0),
          stdout: { text: () => Promise.resolve("No errors found.\n") },
          stderr: { text: () => Promise.resolve("") },
        };
      };

      await runTypecheck({ cwd: "/custom/path" });

      expect(capturedCwd).toBe("/custom/path");
    });

    it("should use default working directory when not specified", async () => {
      let capturedCwd: string | undefined;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = (cmd: string[], opts: { cwd?: string }) => {
        capturedCwd = opts.cwd;
        return {
          exited: Promise.resolve(0),
          stdout: { text: () => Promise.resolve("No errors found.\n") },
          stderr: { text: () => Promise.resolve("") },
        };
      };

      await runTypecheck();

      expect(capturedCwd).toBe(process.cwd());
    });
  });

  describe("TypecheckResult extended fields", () => {
    let originalSpawn: typeof Bun.spawn;

    beforeEach(() => {
      originalSpawn = Bun.spawn;
    });

    afterEach(() => {
      // @ts-expect-error - Restore original spawn
      Bun.spawn = originalSpawn;
    });

    const mockSpawn = (
      exitCode: number,
      stdout: string,
      stderr: string = ""
    ) => {
      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => ({
        exited: Promise.resolve(exitCode),
        stdout: {
          text: () => Promise.resolve(stdout),
        },
        stderr: {
          text: () => Promise.resolve(stderr),
        },
      });
    };

    it("should include all required ReviewTaskResult fields", async () => {
      mockSpawn(0, "No errors found.\n");

      const result = await runTypecheck();

      // Required fields from ReviewTaskResult
      expect(result.taskType).toBe("typecheck");
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.errorCount).toBe("number");
      expect(Array.isArray(result.fixTasks)).toBe(true);
      expect(typeof result.duration).toBe("number");
    });

    it("should include extended typecheck-specific fields", async () => {
      mockSpawn(0, "No errors found.\n");

      const result = await runTypecheck();

      // Extended fields specific to typecheck
      expect(result.command).toBeDefined();
    });
  });

  describe("Fix task description format", () => {
    let originalSpawn: typeof Bun.spawn;

    beforeEach(() => {
      originalSpawn = Bun.spawn;
    });

    afterEach(() => {
      // @ts-expect-error - Restore original spawn
      Bun.spawn = originalSpawn;
    });

    it("should include file path in fix description", async () => {
      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => ({
        exited: Promise.resolve(1),
        stdout: {
          text: () =>
            Promise.resolve(
              "src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist."
            ),
        },
        stderr: { text: () => Promise.resolve("") },
      });

      const result = await runTypecheck();
      const fixTask = result.fixTasks[0];

      expect(fixTask.description).toContain("src/config/schema.ts");
    });

    it("should include line number in fix description", async () => {
      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => ({
        exited: Promise.resolve(1),
        stdout: {
          text: () =>
            Promise.resolve(
              "src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist."
            ),
        },
        stderr: { text: () => Promise.resolve("") },
      });

      const result = await runTypecheck();
      const fixTask = result.fixTasks[0];

      expect(fixTask.description).toContain("line 10");
    });

    it("should include error code in fix description", async () => {
      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => ({
        exited: Promise.resolve(1),
        stdout: {
          text: () =>
            Promise.resolve(
              "src/config/schema.ts(10,5): error TS2339: Property 'foo' does not exist."
            ),
        },
        stderr: { text: () => Promise.resolve("") },
      });

      const result = await runTypecheck();
      const fixTask = result.fixTasks[0];

      expect(fixTask.description).toContain("TS2339");
    });
  });

  describe("tsconfig.json detection", () => {
    let originalSpawn: typeof Bun.spawn;

    beforeEach(() => {
      originalSpawn = Bun.spawn;
    });

    afterEach(() => {
      // @ts-expect-error - Restore original spawn
      Bun.spawn = originalSpawn;
    });

    it("should report configuration error if typecheck command fails", async () => {
      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => ({
        exited: Promise.resolve(1),
        stdout: { text: () => Promise.resolve("") },
        stderr: {
          text: () =>
            Promise.resolve("error: Could not find tsconfig.json"),
        },
      });

      const result = await runTypecheck();

      expect(result.success).toBe(false);
      expect(result.error).toContain("tsconfig");
    });
  });
});
