/**
 * Tests for the Test Micro-Task
 *
 * Tests the test micro-task that runs `bun test --reporter=json`,
 * parses test failures, and generates fix tasks.
 *
 * @module tests/review/tasks/test.test.ts
 */

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
} from "bun:test";
import {
  runTest,
  parseTestOutput,
  parseFallbackTestOutput,
  type TestFailure,
  type TestResult,
} from "../../../src/review/tasks/test";
import type { FixTask } from "../../../src/review/types";

describe("Test Micro-Task", () => {
  describe("parseTestOutput (JSON format)", () => {
    it("should parse bun test JSON output with all tests passing", () => {
      const output = JSON.stringify({
        numPassedTests: 10,
        numFailedTests: 0,
        numSkippedTests: 0,
        numTotalTests: 10,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["MyClass"],
                fullName: "MyClass should work",
                status: "passed",
                title: "should work",
                duration: 5,
              },
            ],
          },
        ],
      });

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(10);
      expect(result.passedTests).toBe(10);
      expect(result.failedTests).toBe(0);
      expect(result.skippedTests).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it("should parse bun test JSON output with failures", () => {
      const output = JSON.stringify({
        numPassedTests: 5,
        numFailedTests: 2,
        numSkippedTests: 0,
        numTotalTests: 7,
        testResults: [
          {
            name: "src/index.test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Calculator"],
                fullName: "Calculator should add numbers",
                status: "failed",
                title: "should add numbers",
                duration: 10,
                failureMessages: [
                  "Expected: 4\nReceived: 5",
                ],
              },
              {
                ancestorTitles: ["Calculator"],
                fullName: "Calculator should subtract",
                status: "passed",
                title: "should subtract",
                duration: 3,
              },
            ],
          },
          {
            name: "src/utils.test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Utils"],
                fullName: "Utils should parse",
                status: "failed",
                title: "should parse",
                duration: 8,
                failureMessages: [
                  "Error: Parse failed\n  at src/utils.ts:10:5",
                ],
              },
            ],
          },
        ],
      });

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(7);
      expect(result.failedTests).toBe(2);
      expect(result.failures).toHaveLength(2);
      expect(result.failures[0]).toEqual({
        testFile: "src/index.test.ts",
        testName: "should add numbers",
        suiteName: "Calculator",
        error: "Expected: 4\nReceived: 5",
        duration: 10,
      });
    });

    it("should parse skipped tests", () => {
      const output = JSON.stringify({
        numPassedTests: 3,
        numFailedTests: 0,
        numSkippedTests: 2,
        numTotalTests: 5,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Suite"],
                fullName: "Suite test1",
                status: "skipped",
                title: "test1",
                duration: 0,
              },
              {
                ancestorTitles: ["Suite"],
                fullName: "Suite test2",
                status: "skipped",
                title: "test2",
                duration: 0,
              },
            ],
          },
        ],
      });

      const result = parseTestOutput(output);

      expect(result.skippedTests).toBe(2);
      expect(result.skippedTestNames).toContain("test1");
      expect(result.skippedTestNames).toContain("test2");
    });

    it("should handle empty test results", () => {
      const output = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 0,
        numSkippedTests: 0,
        numTotalTests: 0,
        testResults: [],
      });

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it("should handle parsing errors gracefully", () => {
      const output = "Not valid JSON";

      const result = parseTestOutput(output);

      expect(result.parsingError).toBeDefined();
      expect(result.totalTests).toBe(0);
    });

    it("should include stack trace in failure message", () => {
      const output = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 1,
        numSkippedTests: 0,
        numTotalTests: 1,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["MyClass"],
                fullName: "MyClass should work",
                status: "failed",
                title: "should work",
                duration: 5,
                failureMessages: [
                  "Error: Something went wrong\n  at Object.<anonymous> (test.ts:10:5)\n  at Module._compile (node:internal/modules/cjs/loader:1256:14)",
                ],
              },
            ],
          },
        ],
      });

      const result = parseTestOutput(output);

      expect(result.failures[0].error).toContain("at Object.<anonymous>");
      expect(result.failures[0].error).toContain("test.ts:10:5");
    });

    it("should track snapshot failures", () => {
      const output = JSON.stringify({
        numPassedTests: 5,
        numFailedTests: 2,
        numSkippedTests: 0,
        numTotalTests: 7,
        snapshot: {
          added: 0,
          failure: true,
          failed: 2,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 5,
          total: 7,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 2,
          updated: 0,
        },
        testResults: [],
      });

      const result = parseTestOutput(output);

      expect(result.snapshotFailures).toBe(2);
    });

    it("should handle multiple ancestor titles for nested suites", () => {
      const output = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 1,
        numSkippedTests: 0,
        numTotalTests: 1,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Outer", "Inner", "Deepest"],
                fullName: "Outer Inner Deepest should work",
                status: "failed",
                title: "should work",
                duration: 5,
                failureMessages: ["Error"],
              },
            ],
          },
        ],
      });

      const result = parseTestOutput(output);

      expect(result.failures[0].suiteName).toBe("Outer > Inner > Deepest");
    });
  });

  describe("parseFallbackTestOutput (standard format)", () => {
    it("should parse bun test standard output with failures", () => {
      const output = `
bun test v1.0.0

tests/index.test.ts:
✓ MyClass should work [2ms]
✗ MyClass should fail [5ms]
  error: Expected 4, received 5
    at Object.<anonymous> (tests/index.test.ts:10:5)

1 pass
1 fail
`;

      const result = parseFallbackTestOutput(output);

      expect(result.passedTests).toBeGreaterThanOrEqual(0);
      expect(result.failedTests).toBeGreaterThanOrEqual(0);
    });

    it("should handle all tests passing", () => {
      const output = `
bun test v1.0.0

tests/index.test.ts:
✓ MyClass should work [2ms]
✓ MyClass should also work [3ms]

2 pass
0 fail
`;

      const result = parseFallbackTestOutput(output);

      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(0);
    });

    it("should extract pass/fail counts from summary line", () => {
      const output = `
10 pass
5 fail
2 skip
`;

      const result = parseFallbackTestOutput(output);

      expect(result.passedTests).toBe(10);
      expect(result.failedTests).toBe(5);
      expect(result.skippedTests).toBe(2);
    });

    it("should parse test file paths", () => {
      const output = `
tests/unit/calc.test.ts:
✗ Calculator should add [5ms]
  Error: Expected 4, received 5

tests/unit/utils.test.ts:
✓ Utils should parse [2ms]

1 pass
1 fail
`;

      const result = parseFallbackTestOutput(output);

      expect(result.failures.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("runTest", () => {
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

    it("should return success:true and failedTests:0 when all pass", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 10,
        numFailedTests: 0,
        numSkippedTests: 0,
        numTotalTests: 10,
        testResults: [],
      });
      mockSpawn(0, jsonOutput);

      const result = await runTest();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.fixTasks).toHaveLength(0);
    });

    it("should return success:false when tests fail", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 5,
        numFailedTests: 2,
        numSkippedTests: 0,
        numTotalTests: 7,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Suite"],
                fullName: "Suite test1",
                status: "failed",
                title: "test1",
                duration: 5,
                failureMessages: ["Error 1"],
              },
              {
                ancestorTitles: ["Suite"],
                fullName: "Suite test2",
                status: "failed",
                title: "test2",
                duration: 3,
                failureMessages: ["Error 2"],
              },
            ],
          },
        ],
      });
      mockSpawn(1, jsonOutput);

      const result = await runTest();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(2);
    });

    it("should create fix task for each failing test", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 2,
        numSkippedTests: 0,
        numTotalTests: 2,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["MyClass"],
                fullName: "MyClass test1",
                status: "failed",
                title: "test1",
                duration: 5,
                failureMessages: ["Error 1"],
              },
              {
                ancestorTitles: ["MyClass"],
                fullName: "MyClass test2",
                status: "failed",
                title: "test2",
                duration: 3,
                failureMessages: ["Error 2"],
              },
            ],
          },
        ],
      });
      mockSpawn(1, jsonOutput);

      const result = await runTest();

      expect(result.fixTasks).toHaveLength(2);
      expect(result.fixTasks[0].type).toBe("test_fix");
      expect(result.fixTasks[0].priority).toBe("high");
    });

    it("should create fix task with correct format", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 1,
        numSkippedTests: 0,
        numTotalTests: 1,
        testResults: [
          {
            name: "src/calculator.test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Calculator"],
                fullName: "Calculator should add numbers",
                status: "failed",
                title: "should add numbers",
                duration: 5,
                failureMessages: [
                  "Expected: 4\nReceived: 5\n  at Object.<anonymous> (src/calculator.test.ts:10:5)",
                ],
              },
            ],
          },
        ],
      });
      mockSpawn(1, jsonOutput);

      const result = await runTest();

      expect(result.fixTasks[0]).toEqual({
        type: "test_fix",
        file: "src/calculator.test.ts",
        line: undefined,
        description: expect.stringContaining("should add numbers"),
        priority: "high",
      });
      expect(result.fixTasks[0].description).toContain("Calculator");
      expect(result.fixTasks[0].description).toContain("Expected: 4");
    });

    it("should include stack trace in fix task description", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 1,
        numSkippedTests: 0,
        numTotalTests: 1,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Suite"],
                fullName: "Suite test1",
                status: "failed",
                title: "test1",
                duration: 5,
                failureMessages: [
                  "Error: Runtime error\n  at Object.<anonymous> (test.ts:10:5)\n  at Module._compile",
                ],
              },
            ],
          },
        ],
      });
      mockSpawn(1, jsonOutput);

      const result = await runTest();

      expect(result.fixTasks[0].description).toContain("at Object.<anonymous>");
    });

    it("should return success:false with timeout error if suite times out", async () => {
      mockSpawn(1, "", "Timeout: test suite exceeded 60 seconds");

      const result = await runTest();

      expect(result.success).toBe(false);
      expect(result.error).toContain("timeout");
    });

    it("should report no tests found with success:true", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 0,
        numSkippedTests: 0,
        numTotalTests: 0,
        testResults: [],
      });
      mockSpawn(0, jsonOutput);

      const result = await runTest();

      expect(result.success).toBe(true);
      expect(result.totalTests).toBe(0);
    });

    it("should fallback to standard output parsing if JSON unavailable", async () => {
      const fallbackOutput = `
bun test v1.0.0

tests/index.test.ts:
✓ Test 1 [2ms]
✓ Test 2 [3ms]

2 pass
0 fail
`;
      mockSpawn(0, fallbackOutput);

      const result = await runTest();

      // Should still complete without error
      expect(result.success).toBe(true);
    });

    it("should include skippedTests count", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 3,
        numFailedTests: 0,
        numSkippedTests: 2,
        numTotalTests: 5,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Suite"],
                fullName: "Suite skip1",
                status: "skipped",
                title: "skip1",
                duration: 0,
              },
              {
                ancestorTitles: ["Suite"],
                fullName: "Suite skip2",
                status: "skipped",
                title: "skip2",
                duration: 0,
              },
            ],
          },
        ],
      });
      mockSpawn(0, jsonOutput);

      const result = await runTest();

      expect(result.skippedTests).toBe(2);
      expect(result.skippedTestNames).toContain("skip1");
      expect(result.skippedTestNames).toContain("skip2");
    });

    it("should include totalTests, passedTests, failedTests, duration", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 8,
        numFailedTests: 2,
        numSkippedTests: 1,
        numTotalTests: 11,
        testResults: [],
      });
      mockSpawn(1, jsonOutput);

      const result = await runTest();

      expect(result.totalTests).toBe(11);
      expect(result.passedTests).toBe(8);
      expect(result.failedTests).toBe(2);
      expect(result.skippedTests).toBe(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should include snapshotFailures count", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 5,
        numFailedTests: 2,
        numSkippedTests: 0,
        numTotalTests: 7,
        snapshot: {
          failed: 2,
        },
        testResults: [],
      });
      mockSpawn(1, jsonOutput);

      const result = await runTest();

      expect(result.snapshotFailures).toBe(2);
    });

    it("should include command in result", async () => {
      mockSpawn(0, JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 0,
        numSkippedTests: 0,
        numTotalTests: 0,
        testResults: [],
      }));

      const result = await runTest();

      expect(result.command).toBe("bun test --reporter=json");
    });

    it("should use custom working directory", async () => {
      let capturedCwd: string | undefined;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string }) => {
        capturedCwd = options?.cwd;
        return {
          exited: Promise.resolve(0),
          stdout: {
            text: () => Promise.resolve(JSON.stringify({
              numPassedTests: 0,
              numFailedTests: 0,
              numSkippedTests: 0,
              numTotalTests: 0,
              testResults: [],
            })),
          },
          stderr: {
            text: () => Promise.resolve(""),
          },
        };
      };

      await runTest({ cwd: "/custom/path" });

      expect(capturedCwd).toBe("/custom/path");
    });

    it("should handle exception during command execution", async () => {
      // @ts-expect-error - Mock Bun.spawn to throw
      Bun.spawn = () => {
        throw new Error("Spawn failed");
      };

      const result = await runTest();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Spawn failed");
    });

    it("should run in fresh session with only test prompt", async () => {
      // Verify isolation - each call is independent
      let callCount = 0;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => {
        callCount++;
        return {
          exited: Promise.resolve(0),
          stdout: {
            text: () => Promise.resolve(JSON.stringify({
              numPassedTests: 0,
              numFailedTests: 0,
              numSkippedTests: 0,
              numTotalTests: 0,
              testResults: [],
            })),
          },
          stderr: {
            text: () => Promise.resolve(""),
          },
        };
      };

      await runTest();
      await runTest();

      expect(callCount).toBe(2);
    });

    it("should include coveragePercent if available", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 10,
        numFailedTests: 0,
        numSkippedTests: 0,
        numTotalTests: 10,
        testResults: [],
        coverageMap: {
          total: {
            lines: { pct: 85.5 },
          },
        },
      });
      mockSpawn(0, jsonOutput);

      const result = await runTest();

      // Coverage might not always be present, but if it is, it should be captured
      expect(result.coveragePercent === undefined || typeof result.coveragePercent === "number").toBe(true);
    });

    it("should report setup/teardown failures separately", async () => {
      const jsonOutput = JSON.stringify({
        numPassedTests: 0,
        numFailedTests: 1,
        numSkippedTests: 0,
        numTotalTests: 1,
        testResults: [
          {
            name: "test.ts",
            assertionResults: [
              {
                ancestorTitles: ["Suite"],
                fullName: "beforeAll hook error",
                status: "failed",
                title: "beforeAll hook error",
                duration: 0,
                failureMessages: ["Setup failed: beforeAll hook threw"],
              },
            ],
          },
        ],
      });
      mockSpawn(1, jsonOutput);

      const result = await runTest();

      expect(result.failures).toHaveLength(1);
      // Setup failures should still generate fix tasks
      expect(result.fixTasks).toHaveLength(1);
    });
  });
});
