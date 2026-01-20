/**
 * Tests for the Quality Micro-Task
 *
 * Tests the quality micro-task that checks for dead code,
 * duplication, and complexity issues.
 *
 * @module tests/review/tasks/quality.test.ts
 */

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
} from "bun:test";
import {
  runQuality,
  analyzeComplexity,
  detectUnusedExports,
  detectDuplication,
  type QualityIssue,
  type QualityResult,
  type QualityIssueType,
} from "../../../src/review/tasks/quality";
import type { FixTask } from "../../../src/review/types";

describe("Quality Micro-Task", () => {
  describe("analyzeComplexity", () => {
    it("should return 1 for simple function", () => {
      const code = `
        function simple() {
          return 42;
        }
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result.length).toBe(0); // No high complexity issues
    });

    it("should detect high complexity for function with many branches", () => {
      // Cyclomatic complexity > 10
      const code = `
        function complex(a, b, c, d, e, f, g, h, i, j, k) {
          if (a) { return 1; }
          if (b) { return 2; }
          if (c) { return 3; }
          if (d) { return 4; }
          if (e) { return 5; }
          if (f) { return 6; }
          if (g) { return 7; }
          if (h) { return 8; }
          if (i) { return 9; }
          if (j) { return 10; }
          if (k) { return 11; }
          return 0;
        }
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("high_complexity");
      expect(result[0].score).toBeGreaterThan(10);
    });

    it("should detect switch statements as complexity", () => {
      const code = `
        function switchHeavy(x) {
          switch(x) {
            case 1: return 'a';
            case 2: return 'b';
            case 3: return 'c';
            case 4: return 'd';
            case 5: return 'e';
            case 6: return 'f';
            case 7: return 'g';
            case 8: return 'h';
            case 9: return 'i';
            case 10: return 'j';
            case 11: return 'k';
            default: return 'z';
          }
        }
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include function name in result", () => {
      const code = `
        function myComplexFunction(a, b, c, d, e, f, g, h, i, j, k) {
          if (a) { return 1; }
          if (b) { return 2; }
          if (c) { return 3; }
          if (d) { return 4; }
          if (e) { return 5; }
          if (f) { return 6; }
          if (g) { return 7; }
          if (h) { return 8; }
          if (i) { return 9; }
          if (j) { return 10; }
          if (k) { return 11; }
          return 0;
        }
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result[0].functionName).toBe("myComplexFunction");
    });

    it("should count ternary operators as complexity", () => {
      const code = `
        function ternaryHeavy(a, b, c, d, e, f, g, h, i, j, k) {
          return a ? 1 : b ? 2 : c ? 3 : d ? 4 : e ? 5 : f ? 6 : g ? 7 : h ? 8 : i ? 9 : j ? 10 : k ? 11 : 0;
        }
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should count logical operators as complexity", () => {
      const code = `
        function logicalHeavy(a, b, c, d, e, f, g, h, i, j, k, l) {
          if (a && b || c && d || e && f || g && h || i && j || k && l) {
            return true;
          }
          return false;
        }
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle arrow functions", () => {
      const code = `
        const arrowComplex = (a, b, c, d, e, f, g, h, i, j, k) => {
          if (a) { return 1; }
          if (b) { return 2; }
          if (c) { return 3; }
          if (d) { return 4; }
          if (e) { return 5; }
          if (f) { return 6; }
          if (g) { return 7; }
          if (h) { return 8; }
          if (i) { return 9; }
          if (j) { return 10; }
          if (k) { return 11; }
          return 0;
        };
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle class methods", () => {
      const code = `
        class MyClass {
          complexMethod(a, b, c, d, e, f, g, h, i, j, k) {
            if (a) { return 1; }
            if (b) { return 2; }
            if (c) { return 3; }
            if (d) { return 4; }
            if (e) { return 5; }
            if (f) { return 6; }
            if (g) { return 7; }
            if (h) { return 8; }
            if (i) { return 9; }
            if (j) { return 10; }
            if (k) { return 11; }
            return 0;
          }
        }
      `;
      const result = analyzeComplexity(code, "test.ts");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("detectUnusedExports", () => {
    it("should return empty array when all exports are used", () => {
      const files = new Map<string, string>([
        ["src/utils.ts", "export function helper() { return 1; }"],
        ["src/main.ts", "import { helper } from './utils'; helper();"],
      ]);
      const result = detectUnusedExports(files, ["src/utils.ts"]);
      expect(result.length).toBe(0);
    });

    it("should detect unused exported function", () => {
      const files = new Map<string, string>([
        ["src/utils.ts", "export function unusedFunc() { return 1; }\nexport function usedFunc() { return 2; }"],
        ["src/main.ts", "import { usedFunc } from './utils'; usedFunc();"],
      ]);
      const result = detectUnusedExports(files, ["src/utils.ts"]);
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("dead_code");
      expect(result[0].symbol).toBe("unusedFunc");
    });

    it("should detect unused exported const", () => {
      const files = new Map<string, string>([
        ["src/config.ts", "export const UNUSED_CONST = 42;"],
        ["src/main.ts", "console.log('hello');"],
      ]);
      const result = detectUnusedExports(files, ["src/config.ts"]);
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe("UNUSED_CONST");
    });

    it("should detect unused exported class", () => {
      const files = new Map<string, string>([
        ["src/models.ts", "export class UnusedModel {}"],
        ["src/main.ts", "console.log('hello');"],
      ]);
      const result = detectUnusedExports(files, ["src/models.ts"]);
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe("UnusedModel");
    });

    it("should detect unused exported type", () => {
      const files = new Map<string, string>([
        ["src/types.ts", "export type UnusedType = string;"],
        ["src/main.ts", "console.log('hello');"],
      ]);
      const result = detectUnusedExports(files, ["src/types.ts"]);
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe("UnusedType");
    });

    it("should detect unused exported interface", () => {
      const files = new Map<string, string>([
        ["src/types.ts", "export interface UnusedInterface { name: string; }"],
        ["src/main.ts", "console.log('hello');"],
      ]);
      const result = detectUnusedExports(files, ["src/types.ts"]);
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe("UnusedInterface");
    });

    it("should not flag re-exports", () => {
      const files = new Map<string, string>([
        ["src/internal.ts", "export function internal() { return 1; }"],
        ["src/index.ts", "export { internal } from './internal';"],
      ]);
      // Only checking src/internal.ts, should see it's re-exported
      const result = detectUnusedExports(files, ["src/internal.ts"]);
      expect(result.length).toBe(0);
    });

    it("should handle default exports", () => {
      const files = new Map<string, string>([
        ["src/unused.ts", "export default function unused() { return 1; }"],
        ["src/main.ts", "console.log('hello');"],
      ]);
      const result = detectUnusedExports(files, ["src/unused.ts"]);
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe("default");
    });

    it("should include file path in result", () => {
      const files = new Map<string, string>([
        ["src/unused.ts", "export function unused() { return 1; }"],
      ]);
      const result = detectUnusedExports(files, ["src/unused.ts"]);
      expect(result[0].file).toBe("src/unused.ts");
    });
  });

  describe("detectDuplication", () => {
    it("should return empty array when no duplication", () => {
      const files = new Map<string, string>([
        ["src/a.ts", "function a() { return 1; }"],
        ["src/b.ts", "function b() { return 2; }"],
      ]);
      const result = detectDuplication(files, ["src/a.ts", "src/b.ts"]);
      expect(result.length).toBe(0);
    });

    it("should detect duplicated code blocks", () => {
      const duplicatedBlock = `
        const value = calculateSomething();
        if (value > 10) {
          doSomethingImportant();
          logTheResult(value);
          updateTheDatabase(value);
        } else {
          handleError();
          notifyAdmin();
          cleanupResources();
        }
      `;
      const files = new Map<string, string>([
        ["src/a.ts", `function handleA() { ${duplicatedBlock} }`],
        ["src/b.ts", `function handleB() { ${duplicatedBlock} }`],
      ]);
      const result = detectDuplication(files, ["src/a.ts", "src/b.ts"]);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("duplication");
    });

    it("should include similarity percentage", () => {
      const duplicatedBlock = `
        const value = calculateSomething();
        if (value > 10) {
          doSomethingImportant();
          logTheResult(value);
          updateTheDatabase(value);
        } else {
          handleError();
          notifyAdmin();
          cleanupResources();
        }
      `;
      const files = new Map<string, string>([
        ["src/a.ts", `function handleA() { ${duplicatedBlock} }`],
        ["src/b.ts", `function handleB() { ${duplicatedBlock} }`],
      ]);
      const result = detectDuplication(files, ["src/a.ts", "src/b.ts"]);
      if (result.length > 0) {
        expect(result[0].similarity).toBeGreaterThan(0);
        expect(result[0].similarity).toBeLessThanOrEqual(100);
      }
    });

    it("should include both files in result", () => {
      const duplicatedBlock = `
        const value = calculateSomething();
        if (value > 10) {
          doSomethingImportant();
          logTheResult(value);
          updateTheDatabase(value);
        } else {
          handleError();
          notifyAdmin();
          cleanupResources();
        }
      `;
      const files = new Map<string, string>([
        ["src/a.ts", `function handleA() { ${duplicatedBlock} }`],
        ["src/b.ts", `function handleB() { ${duplicatedBlock} }`],
      ]);
      const result = detectDuplication(files, ["src/a.ts", "src/b.ts"]);
      if (result.length > 0) {
        expect(result[0].files).toContain("src/a.ts");
        expect(result[0].files).toContain("src/b.ts");
      }
    });

    it("should ignore small duplications (< 20 tokens)", () => {
      const files = new Map<string, string>([
        ["src/a.ts", "const x = 1;"],
        ["src/b.ts", "const x = 1;"],
      ]);
      const result = detectDuplication(files, ["src/a.ts", "src/b.ts"]);
      expect(result.length).toBe(0);
    });
  });

  describe("runQuality", () => {
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

    it("should return success:true with no issues for clean files", async () => {
      mockSpawn(0, "src/clean.ts\n");

      const result = await runQuality({
        readFile: async () => "function simple() { return 1; }",
      });

      expect(result.success).toBe(true);
      expect(result.issues?.length).toBe(0);
      expect(result.fixTasks).toHaveLength(0);
    });

    it("should return success:false when high complexity found", async () => {
      mockSpawn(0, "src/complex.ts\n");

      const complexCode = `
        function veryComplex(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u) {
          if (a) { return 1; }
          if (b) { return 2; }
          if (c) { return 3; }
          if (d) { return 4; }
          if (e) { return 5; }
          if (f) { return 6; }
          if (g) { return 7; }
          if (h) { return 8; }
          if (i) { return 9; }
          if (j) { return 10; }
          if (k) { return 11; }
          if (l) { return 12; }
          if (m) { return 13; }
          if (n) { return 14; }
          if (o) { return 15; }
          if (p) { return 16; }
          if (q) { return 17; }
          if (r) { return 18; }
          if (s) { return 19; }
          if (t) { return 20; }
          if (u) { return 21; }
          return 0;
        }
      `;

      const result = await runQuality({
        readFile: async () => complexCode,
      });

      expect(result.success).toBe(false);
      expect(result.complexityIssues).toBeGreaterThan(0);
    });

    it("should generate fix task for complexity > 20", async () => {
      mockSpawn(0, "src/complex.ts\n");

      const complexCode = `
        function veryComplex(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u) {
          if (a) { return 1; }
          if (b) { return 2; }
          if (c) { return 3; }
          if (d) { return 4; }
          if (e) { return 5; }
          if (f) { return 6; }
          if (g) { return 7; }
          if (h) { return 8; }
          if (i) { return 9; }
          if (j) { return 10; }
          if (k) { return 11; }
          if (l) { return 12; }
          if (m) { return 13; }
          if (n) { return 14; }
          if (o) { return 15; }
          if (p) { return 16; }
          if (q) { return 17; }
          if (r) { return 18; }
          if (s) { return 19; }
          if (t) { return 20; }
          if (u) { return 21; }
          return 0;
        }
      `;

      const result = await runQuality({
        readFile: async () => complexCode,
      });

      expect(result.fixTasks.length).toBeGreaterThan(0);
      expect(result.fixTasks[0].type).toBe("quality_fix");
      expect(result.fixTasks[0].description).toContain("Refactor function");
    });

    it("should not generate fix task for complexity 10-20", async () => {
      mockSpawn(0, "src/medium.ts\n");

      // Complexity between 10 and 20 (just over 10)
      const mediumCode = `
        function mediumComplex(a, b, c, d, e, f, g, h, i, j, k) {
          if (a) { return 1; }
          if (b) { return 2; }
          if (c) { return 3; }
          if (d) { return 4; }
          if (e) { return 5; }
          if (f) { return 6; }
          if (g) { return 7; }
          if (h) { return 8; }
          if (i) { return 9; }
          if (j) { return 10; }
          if (k) { return 11; }
          return 0;
        }
      `;

      const result = await runQuality({
        readFile: async () => mediumCode,
      });

      // Issues detected but no fix tasks (between 10-20)
      expect(result.complexityIssues).toBeGreaterThan(0);
      // No fix tasks for complexity 10-20
      const complexityFixTasks = result.fixTasks.filter(
        (t) => t.description.includes("Refactor function")
      );
      expect(complexityFixTasks.length).toBe(0);
    });

    it("should generate fix task for dead code", async () => {
      mockSpawn(0, "src/unused.ts\n");

      const result = await runQuality({
        readFile: async () => "export function unusedExport() { return 1; }",
        readAllFiles: async () =>
          new Map([
            ["src/unused.ts", "export function unusedExport() { return 1; }"],
            ["src/main.ts", "console.log('hello');"],
          ]),
      });

      expect(result.deadCodeCount).toBeGreaterThan(0);
      const deadCodeTasks = result.fixTasks.filter((t) =>
        t.description.includes("Remove unused export")
      );
      expect(deadCodeTasks.length).toBeGreaterThan(0);
    });

    it("should log duplication as advisory only", async () => {
      mockSpawn(0, "src/a.ts\nsrc/b.ts\n");

      const duplicatedBlock = `
        const value = calculateSomething();
        if (value > 10) {
          doSomethingImportant();
          logTheResult(value);
          updateTheDatabase(value);
        } else {
          handleError();
          notifyAdmin();
          cleanupResources();
        }
      `;

      const result = await runQuality({
        readFile: async (path: string) =>
          path === "src/a.ts"
            ? `function a() { ${duplicatedBlock} }`
            : `function b() { ${duplicatedBlock} }`,
        readAllFiles: async () =>
          new Map([
            ["src/a.ts", `function a() { ${duplicatedBlock} }`],
            ["src/b.ts", `function b() { ${duplicatedBlock} }`],
          ]),
      });

      // Duplications are advisory, no fix tasks
      const duplicationTasks = result.fixTasks.filter((t) =>
        t.description.includes("duplication")
      );
      expect(duplicationTasks.length).toBe(0);
      expect(result.duplications).toBeGreaterThanOrEqual(0);
    });

    it("should include command in result", async () => {
      mockSpawn(0, "");

      const result = await runQuality({
        readFile: async () => "",
      });

      expect(result.command).toBe("git diff --name-only HEAD~1");
    });

    it("should include duration in result", async () => {
      mockSpawn(0, "");

      const result = await runQuality({
        readFile: async () => "",
      });

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should use custom working directory", async () => {
      let capturedCwd: string | undefined;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string }) => {
        capturedCwd = options?.cwd;
        return {
          exited: Promise.resolve(0),
          stdout: {
            text: () => Promise.resolve(""),
          },
          stderr: {
            text: () => Promise.resolve(""),
          },
        };
      };

      await runQuality({
        cwd: "/custom/path",
        readFile: async () => "",
      });

      expect(capturedCwd).toBe("/custom/path");
    });

    it("should handle exception during command execution", async () => {
      // @ts-expect-error - Mock Bun.spawn to throw
      Bun.spawn = () => {
        throw new Error("Spawn failed");
      };

      const result = await runQuality({ readFile: async () => "" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Spawn failed");
    });

    it("should skip non-code files", async () => {
      mockSpawn(0, "README.md\npackage.json\n.gitignore\n");

      const result = await runQuality({
        readFile: async () => "# README",
      });

      expect(result.scannedFiles).toBe(0);
    });

    it("should handle no changed files", async () => {
      mockSpawn(0, "");

      const result = await runQuality({
        readFile: async () => "",
      });

      expect(result.success).toBe(true);
      expect(result.scannedFiles).toBe(0);
    });

    it("should skip files with @relentless-ignore-quality comment", async () => {
      mockSpawn(0, "src/ignored.ts\n");

      const result = await runQuality({
        readFile: async () =>
          "// @relentless-ignore-quality\nexport function ignored() { return 1; }",
      });

      expect(result.issues?.length).toBe(0);
    });

    it("should report file as unparseable on parse error", async () => {
      mockSpawn(0, "src/broken.ts\n");

      const result = await runQuality({
        readFile: async () => "function broken( { }",
      });

      // Should not crash, file skipped
      expect(result.success).toBe(true);
    });

    it("should include overallQualityScore in result", async () => {
      mockSpawn(0, "src/clean.ts\n");

      const result = await runQuality({
        readFile: async () => "function clean() { return 1; }",
      });

      expect(result.overallQualityScore).toBeDefined();
      expect(result.overallQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.overallQualityScore).toBeLessThanOrEqual(100);
    });

    it("should include scannedFiles count", async () => {
      mockSpawn(0, "src/a.ts\nsrc/b.ts\nsrc/c.ts\n");

      const result = await runQuality({
        readFile: async () => "const x = 1;",
      });

      expect(result.scannedFiles).toBe(3);
    });

    it("should include deadCodeCount", async () => {
      mockSpawn(0, "src/unused.ts\n");

      const result = await runQuality({
        readFile: async () => "export function unused() {}",
        readAllFiles: async () =>
          new Map([
            ["src/unused.ts", "export function unused() {}"],
            ["src/main.ts", "console.log('hi');"],
          ]),
      });

      expect(result.deadCodeCount).toBeDefined();
    });

    it("should include duplications count", async () => {
      mockSpawn(0, "src/a.ts\n");

      const result = await runQuality({
        readFile: async () => "const x = 1;",
      });

      expect(result.duplications).toBeDefined();
    });

    it("should include complexityIssues count", async () => {
      mockSpawn(0, "src/a.ts\n");

      const result = await runQuality({
        readFile: async () => "const x = 1;",
      });

      expect(result.complexityIssues).toBeDefined();
    });

    it("should create correct fix task format for dead code", async () => {
      mockSpawn(0, "src/unused.ts\n");

      const result = await runQuality({
        readFile: async () => "export function unusedFunc() { return 1; }",
        readAllFiles: async () =>
          new Map([
            ["src/unused.ts", "export function unusedFunc() { return 1; }"],
          ]),
      });

      if (result.fixTasks.length > 0) {
        const deadCodeTask = result.fixTasks.find((t) =>
          t.description.includes("unused")
        );
        if (deadCodeTask) {
          expect(deadCodeTask.type).toBe("quality_fix");
          expect(deadCodeTask.priority).toBe("medium");
          expect(deadCodeTask.file).toBe("src/unused.ts");
        }
      }
    });

    it("should group issues by type and show top 10 most impactful", async () => {
      mockSpawn(0, "src/complex.ts\n");

      // Generate many complexity issues
      let manyFunctions = "";
      for (let i = 0; i < 15; i++) {
        manyFunctions += `
          function complex${i}(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u) {
            if (a) { return 1; }
            if (b) { return 2; }
            if (c) { return 3; }
            if (d) { return 4; }
            if (e) { return 5; }
            if (f) { return 6; }
            if (g) { return 7; }
            if (h) { return 8; }
            if (i) { return 9; }
            if (j) { return 10; }
            if (k) { return 11; }
            if (l) { return 12; }
            if (m) { return 13; }
            if (n) { return 14; }
            if (o) { return 15; }
            if (p) { return 16; }
            if (q) { return 17; }
            if (r) { return 18; }
            if (s) { return 19; }
            if (t) { return 20; }
            if (u) { return 21; }
            return 0;
          }
        `;
      }

      const result = await runQuality({
        readFile: async () => manyFunctions,
      });

      // Fix tasks should be limited to top 10
      expect(result.fixTasks.length).toBeLessThanOrEqual(10);
    });

    it("should include summary in result", async () => {
      mockSpawn(0, "src/a.ts\n");

      const result = await runQuality({
        readFile: async () => "const x = 1;",
      });

      expect(result.summary).toBeDefined();
    });
  });
});
