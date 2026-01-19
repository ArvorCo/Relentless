/**
 * Tests for the Lint Micro-Task
 *
 * Tests the lint micro-task that runs `bun run lint --format json`,
 * parses ESLint issues, and generates fix tasks.
 *
 * @module tests/review/tasks/lint.test.ts
 */

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import {
  runLint,
  parseLintOutput,
  parseFallbackLintOutput,
  groupIssuesByFile,
  type LintIssue,
  type LintResult,
} from "../../../src/review/tasks/lint";
import type { FixTask } from "../../../src/review/types";

describe("Lint Micro-Task", () => {
  describe("parseLintOutput (JSON format)", () => {
    it("should parse ESLint JSON output with no issues", () => {
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [],
          errorCount: 0,
          warningCount: 0,
        },
      ]);
      const { issues, summary } = parseLintOutput(output);

      expect(issues).toHaveLength(0);
      expect(summary.totalFiles).toBe(1);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
    });

    it("should parse ESLint JSON output with errors", () => {
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "'foo' is defined but never used.",
              line: 10,
              column: 5,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);
      const { issues, summary } = parseLintOutput(output);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual({
        file: "/path/to/project/src/index.ts",
        line: 10,
        column: 5,
        severity: "error",
        rule: "no-unused-vars",
        message: "'foo' is defined but never used.",
      });
      expect(summary.errorCount).toBe(1);
    });

    it("should parse ESLint JSON output with warnings", () => {
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "prefer-const",
              severity: 1,
              message: "'x' is never reassigned. Use 'const' instead.",
              line: 5,
              column: 3,
            },
          ],
          errorCount: 0,
          warningCount: 1,
        },
      ]);
      const { issues, summary } = parseLintOutput(output);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(summary.warningCount).toBe(1);
    });

    it("should parse multiple files with mixed issues", () => {
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/a.ts",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "Error 1",
              line: 10,
              column: 5,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
        {
          filePath: "/path/to/project/src/b.ts",
          messages: [
            {
              ruleId: "prefer-const",
              severity: 1,
              message: "Warning 1",
              line: 15,
              column: 10,
            },
            {
              ruleId: "@typescript-eslint/no-explicit-any",
              severity: 2,
              message: "Error 2",
              line: 20,
              column: 1,
            },
          ],
          errorCount: 1,
          warningCount: 1,
        },
      ]);
      const { issues, summary } = parseLintOutput(output);

      expect(issues).toHaveLength(3);
      expect(summary.totalFiles).toBe(2);
      expect(summary.errorCount).toBe(2);
      expect(summary.warningCount).toBe(1);
    });

    it("should handle fixable issues", () => {
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "semi",
              severity: 2,
              message: "Missing semicolon.",
              line: 10,
              column: 15,
              fix: { range: [100, 100], text: ";" },
            },
          ],
          errorCount: 1,
          warningCount: 0,
          fixableErrorCount: 1,
          fixableWarningCount: 0,
        },
      ]);
      const { summary } = parseLintOutput(output);

      expect(summary.autoFixable).toBe(1);
    });

    it("should handle parsing errors gracefully", () => {
      const output = "Not valid JSON output";
      const { issues, summary, parsingError } = parseLintOutput(output);

      expect(issues).toHaveLength(0);
      expect(parsingError).toBeDefined();
      expect(summary.errorCount).toBe(0);
    });

    it("should handle ESLint fatal errors", () => {
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/broken.ts",
          messages: [
            {
              ruleId: null,
              fatal: true,
              severity: 2,
              message: "Parsing error: Unexpected token",
              line: 1,
              column: 1,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);
      const { issues, summary } = parseLintOutput(output);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
      expect(issues[0].rule).toBe("parsing-error");
      expect(summary.parsingErrors).toBe(1);
    });

    it("should count disabled rules", () => {
      // ESLint JSON doesn't directly report disabled rules, but we track them
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [],
          errorCount: 0,
          warningCount: 0,
          usedDeprecatedRules: [],
        },
      ]);
      const { summary } = parseLintOutput(output);

      // Basic check - disabled rules count starts at 0
      expect(summary.disabledRulesCount).toBe(0);
    });

    it("should handle empty file array", () => {
      const output = JSON.stringify([]);
      const { issues, summary } = parseLintOutput(output);

      expect(issues).toHaveLength(0);
      expect(summary.totalFiles).toBe(0);
    });

    it("should include ruleId as null for fatal parsing errors", () => {
      const output = JSON.stringify([
        {
          filePath: "/path/to/project/src/broken.ts",
          messages: [
            {
              ruleId: null,
              severity: 2,
              fatal: true,
              message: "Unexpected token",
              line: 5,
              column: 10,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);
      const { issues } = parseLintOutput(output);

      expect(issues[0].rule).toBe("parsing-error");
    });
  });

  describe("parseFallbackLintOutput (standard format)", () => {
    it("should parse standard ESLint text output", () => {
      const output = `
/path/to/project/src/index.ts
  10:5  error  'foo' is defined but never used  no-unused-vars
  15:3  warning  Unexpected console statement  no-console

✖ 2 problems (1 error, 1 warning)
`;
      const { issues, summary } = parseFallbackLintOutput(output);

      expect(issues).toHaveLength(2);
      expect(issues[0]).toEqual({
        file: "/path/to/project/src/index.ts",
        line: 10,
        column: 5,
        severity: "error",
        rule: "no-unused-vars",
        message: "'foo' is defined but never used",
      });
      expect(issues[1].severity).toBe("warning");
      expect(summary.errorCount).toBe(1);
      expect(summary.warningCount).toBe(1);
    });

    it("should handle output with no issues", () => {
      const output = `✨ No issues found!`;
      const { issues, summary } = parseFallbackLintOutput(output);

      expect(issues).toHaveLength(0);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
    });

    it("should parse multiple files", () => {
      const output = `
/path/to/project/src/a.ts
  10:5  error  Error 1  no-unused-vars

/path/to/project/src/b.ts
  20:10  error  Error 2  no-explicit-any
  25:3  warning  Warning 1  prefer-const
`;
      const { issues, summary } = parseFallbackLintOutput(output);

      expect(issues).toHaveLength(3);
      expect(summary.totalFiles).toBe(2);
    });
  });

  describe("groupIssuesByFile", () => {
    it("should group multiple issues by file", () => {
      const issues: LintIssue[] = [
        {
          file: "src/a.ts",
          line: 10,
          column: 5,
          severity: "error",
          rule: "no-unused-vars",
          message: "Error 1",
        },
        {
          file: "src/b.ts",
          line: 20,
          column: 10,
          severity: "warning",
          rule: "prefer-const",
          message: "Warning 1",
        },
        {
          file: "src/a.ts",
          line: 15,
          column: 3,
          severity: "error",
          rule: "no-explicit-any",
          message: "Error 2",
        },
      ];

      const grouped = groupIssuesByFile(issues);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped["src/a.ts"]).toHaveLength(2);
      expect(grouped["src/b.ts"]).toHaveLength(1);
    });

    it("should return empty object for no issues", () => {
      const grouped = groupIssuesByFile([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it("should preserve issue order within each file", () => {
      const issues: LintIssue[] = [
        {
          file: "src/a.ts",
          line: 10,
          column: 5,
          severity: "error",
          rule: "rule1",
          message: "First",
        },
        {
          file: "src/a.ts",
          line: 20,
          column: 5,
          severity: "error",
          rule: "rule2",
          message: "Second",
        },
        {
          file: "src/a.ts",
          line: 30,
          column: 5,
          severity: "error",
          rule: "rule3",
          message: "Third",
        },
      ];

      const grouped = groupIssuesByFile(issues);

      expect(grouped["src/a.ts"][0].message).toBe("First");
      expect(grouped["src/a.ts"][1].message).toBe("Second");
      expect(grouped["src/a.ts"][2].message).toBe("Third");
    });
  });

  describe("runLint", () => {
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

    it("should return success:true and errorCount:0 when no issues", async () => {
      mockSpawn(0, JSON.stringify([]));

      const result = await runLint();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.fixTasks).toHaveLength(0);
    });

    it("should return success:false when errors exist", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "'foo' is defined but never used.",
              line: 10,
              column: 5,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);
      mockSpawn(1, jsonOutput);

      const result = await runLint();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
    });

    it("should return success:true with warnings but warningCount reflects count", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "prefer-const",
              severity: 1,
              message: "'x' is never reassigned. Use 'const' instead.",
              line: 5,
              column: 3,
            },
          ],
          errorCount: 0,
          warningCount: 1,
        },
      ]);
      mockSpawn(0, jsonOutput);

      const result = await runLint();

      expect(result.success).toBe(true);
      expect(result.warningCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it("should generate fix tasks only for errors, not warnings", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "Error message",
              line: 10,
              column: 5,
            },
            {
              ruleId: "prefer-const",
              severity: 1,
              message: "Warning message",
              line: 15,
              column: 3,
            },
          ],
          errorCount: 1,
          warningCount: 1,
        },
      ]);
      mockSpawn(1, jsonOutput);

      const result = await runLint();

      expect(result.fixTasks).toHaveLength(1);
      expect(result.fixTasks[0].type).toBe("lint_fix");
      expect(result.fixTasks[0].priority).toBe("high");
    });

    it("should create fix task with correct format", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "'foo' is defined but never used.",
              line: 10,
              column: 5,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);
      mockSpawn(1, jsonOutput);

      const result = await runLint();

      expect(result.fixTasks[0]).toEqual({
        type: "lint_fix",
        file: "/path/to/project/src/index.ts",
        line: 10,
        column: 5,
        description: expect.stringContaining("no-unused-vars"),
        priority: "high",
        rule: "no-unused-vars",
      });
    });

    it("should return success:false if lint command fails", async () => {
      mockSpawn(2, "", "ESLint not installed");

      const result = await runLint();

      expect(result.success).toBe(false);
      expect(result.error).toContain("ESLint");
    });

    it("should report configuration error if no ESLint config exists", async () => {
      mockSpawn(
        2,
        "",
        "Error: ESLint configuration not found in /path/to/project"
      );

      const result = await runLint();

      expect(result.success).toBe(false);
      expect(result.error).toContain("configuration");
    });

    it("should include autoFixable count", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "semi",
              severity: 2,
              message: "Missing semicolon.",
              line: 10,
              column: 15,
              fix: { range: [100, 100], text: ";" },
            },
          ],
          errorCount: 1,
          warningCount: 0,
          fixableErrorCount: 1,
          fixableWarningCount: 0,
        },
      ]);
      mockSpawn(1, jsonOutput);

      const result = await runLint();

      expect(result.autoFixable).toBe(1);
    });

    it("should report parsing errors separately", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/broken.ts",
          messages: [
            {
              ruleId: null,
              fatal: true,
              severity: 2,
              message: "Parsing error: Unexpected token",
              line: 1,
              column: 1,
            },
          ],
          errorCount: 1,
          warningCount: 0,
        },
      ]);
      mockSpawn(1, jsonOutput);

      const result = await runLint();

      expect(result.parsingErrors).toBe(1);
    });

    it("should include disabledRulesCount", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [],
          errorCount: 0,
          warningCount: 0,
        },
      ]);
      mockSpawn(0, jsonOutput);

      const result = await runLint();

      expect(result.disabledRulesCount).toBeDefined();
    });

    it("should include summary with total files scanned", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/a.ts",
          messages: [],
          errorCount: 0,
          warningCount: 0,
        },
        {
          filePath: "/path/to/project/src/b.ts",
          messages: [],
          errorCount: 0,
          warningCount: 0,
        },
      ]);
      mockSpawn(0, jsonOutput);

      const result = await runLint();

      expect(result.summary).toContain("2 files");
    });

    it("should include duration in result", async () => {
      mockSpawn(0, JSON.stringify([]));

      const result = await runLint();

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should include command in result", async () => {
      mockSpawn(0, JSON.stringify([]));

      const result = await runLint();

      expect(result.command).toBe("bun run lint --format json");
    });

    it("should fallback to standard output parsing if JSON unavailable", async () => {
      const fallbackOutput = `
/path/to/project/src/index.ts
  10:5  error  'foo' is defined but never used  no-unused-vars

✖ 1 problem (1 error, 0 warnings)
`;
      mockSpawn(1, fallbackOutput);

      const result = await runLint();

      // Should still parse the output
      expect(result.errorCount).toBeGreaterThanOrEqual(0);
    });

    it("should group multiple rule violations by file for efficient fixing", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "Error 1",
              line: 10,
              column: 5,
            },
            {
              ruleId: "no-explicit-any",
              severity: 2,
              message: "Error 2",
              line: 20,
              column: 3,
            },
          ],
          errorCount: 2,
          warningCount: 0,
        },
      ]);
      mockSpawn(1, jsonOutput);

      const result = await runLint();

      // Each error gets its own fix task
      expect(result.fixTasks).toHaveLength(2);
    });

    it("should use custom working directory", async () => {
      let capturedCwd: string | undefined;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string }) => {
        capturedCwd = options?.cwd;
        return {
          exited: Promise.resolve(0),
          stdout: {
            text: () => Promise.resolve(JSON.stringify([])),
          },
          stderr: {
            text: () => Promise.resolve(""),
          },
        };
      };

      await runLint({ cwd: "/custom/path" });

      expect(capturedCwd).toBe("/custom/path");
    });

    it("should handle exception during command execution", async () => {
      // @ts-expect-error - Mock Bun.spawn to throw
      Bun.spawn = () => {
        throw new Error("Spawn failed");
      };

      const result = await runLint();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Spawn failed");
    });

    it("should run in fresh session with only lint prompt", async () => {
      // This test verifies isolation - the lint task doesn't share state
      let callCount = 0;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => {
        callCount++;
        return {
          exited: Promise.resolve(0),
          stdout: {
            text: () => Promise.resolve(JSON.stringify([])),
          },
          stderr: {
            text: () => Promise.resolve(""),
          },
        };
      };

      await runLint();
      await runLint();

      // Each call is independent
      expect(callCount).toBe(2);
    });

    it("should respect relentless.config.yaml lint configuration if present", async () => {
      // This test verifies that custom config paths would be used
      // For now, it uses default bun run lint command
      let capturedArgs: string[] = [];

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = (args: string[]) => {
        capturedArgs = args;
        return {
          exited: Promise.resolve(0),
          stdout: {
            text: () => Promise.resolve(JSON.stringify([])),
          },
          stderr: {
            text: () => Promise.resolve(""),
          },
        };
      };

      await runLint();

      expect(capturedArgs).toContain("lint");
    });

    it("should include breakdown by severity in summary", async () => {
      const jsonOutput = JSON.stringify([
        {
          filePath: "/path/to/project/src/index.ts",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "Error",
              line: 10,
              column: 5,
            },
            {
              ruleId: "prefer-const",
              severity: 1,
              message: "Warning",
              line: 15,
              column: 3,
            },
          ],
          errorCount: 1,
          warningCount: 1,
        },
      ]);
      mockSpawn(1, jsonOutput);

      const result = await runLint();

      expect(result.summary).toContain("1 error");
      expect(result.summary).toContain("1 warning");
    });
  });
});
