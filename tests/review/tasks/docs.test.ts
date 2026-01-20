/**
 * Tests for the Docs Micro-Task
 *
 * Tests the docs micro-task that checks if README and JSDoc
 * need updates based on changed files.
 *
 * @module tests/review/tasks/docs.test.ts
 */

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
} from "bun:test";
import {
  runDocs,
  detectMissingJSDoc,
  detectNewExportsWithoutReadme,
  detectNewCliCommandsWithoutReadme,
  type DocsIssue,
  type DocsResult,
  type DocsIssueType,
} from "../../../src/review/tasks/docs";
import type { FixTask } from "../../../src/review/types";

describe("Docs Micro-Task", () => {
  describe("detectMissingJSDoc", () => {
    it("should detect missing JSDoc on exported function", () => {
      const content = `
        export function myFunction() {
          return 42;
        }
      `;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("missing_jsdoc");
      expect(result[0].functionName).toBe("myFunction");
    });

    it("should not flag function with JSDoc", () => {
      const content = `
        /**
         * My documented function
         */
        export function myFunction() {
          return 42;
        }
      `;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result.length).toBe(0);
    });

    it("should detect missing JSDoc on exported const arrow function", () => {
      const content = `
        export const myArrow = () => {
          return 42;
        };
      `;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result.length).toBe(1);
      expect(result[0].functionName).toBe("myArrow");
    });

    it("should not flag const arrow function with JSDoc", () => {
      const content = `
        /**
         * My arrow function
         */
        export const myArrow = () => 42;
      `;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result.length).toBe(0);
    });

    it("should exclude functions with @internal tag", () => {
      const content = `
        /**
         * @internal
         */
        export function internalFunc() {
          return 42;
        }
      `;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result.length).toBe(0);
    });

    it("should skip test files", () => {
      const content = `
        export function testHelper() {
          return 42;
        }
      `;
      const result = detectMissingJSDoc(content, "src/utils.test.ts");
      expect(result.length).toBe(0);
    });

    it("should skip spec files", () => {
      const content = `
        export function specHelper() {
          return 42;
        }
      `;
      const result = detectMissingJSDoc(content, "src/utils.spec.ts");
      expect(result.length).toBe(0);
    });

    it("should detect missing JSDoc on exported class", () => {
      const content = `
        export class MyClass {
          method() {}
        }
      `;
      const result = detectMissingJSDoc(content, "src/models.ts");
      expect(result.length).toBe(1);
      expect(result[0].functionName).toBe("MyClass");
    });

    it("should not flag class with JSDoc", () => {
      const content = `
        /**
         * My documented class
         */
        export class MyClass {
          method() {}
        }
      `;
      const result = detectMissingJSDoc(content, "src/models.ts");
      expect(result.length).toBe(0);
    });

    it("should include file path in result", () => {
      const content = `export function undocumented() {}`;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result[0].file).toBe("src/utils.ts");
    });

    it("should include line number in result", () => {
      const content = `
        const x = 1;
        export function undocumented() {}
      `;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result[0].line).toBeGreaterThan(1);
    });

    it("should handle multiple undocumented exports", () => {
      const content = `
        export function func1() {}
        export function func2() {}
        export const arrow1 = () => {};
      `;
      const result = detectMissingJSDoc(content, "src/utils.ts");
      expect(result.length).toBe(3);
    });
  });

  describe("detectNewExportsWithoutReadme", () => {
    it("should detect new exports in index.ts without README update", () => {
      const changedFiles = ["src/index.ts"];
      const readmeUpdated = false;
      const indexContent = `export { newFunction } from "./new";`;

      const result = detectNewExportsWithoutReadme(
        changedFiles,
        readmeUpdated,
        new Map([["src/index.ts", indexContent]])
      );

      expect(result.length).toBe(1);
      expect(result[0].type).toBe("missing_readme_update");
      expect(result[0].message).toContain("export");
    });

    it("should not flag when README was updated", () => {
      const changedFiles = ["src/index.ts", "README.md"];
      const readmeUpdated = true;
      const indexContent = `export { newFunction } from "./new";`;

      const result = detectNewExportsWithoutReadme(
        changedFiles,
        readmeUpdated,
        new Map([["src/index.ts", indexContent]])
      );

      expect(result.length).toBe(0);
    });

    it("should not flag when no index.ts changed", () => {
      const changedFiles = ["src/utils.ts"];
      const readmeUpdated = false;

      const result = detectNewExportsWithoutReadme(
        changedFiles,
        readmeUpdated,
        new Map([["src/utils.ts", "const x = 1;"]])
      );

      expect(result.length).toBe(0);
    });

    it("should detect changes in any index.ts file", () => {
      const changedFiles = ["src/routing/index.ts"];
      const readmeUpdated = false;
      const indexContent = `export { routeTask } from "./router";`;

      const result = detectNewExportsWithoutReadme(
        changedFiles,
        readmeUpdated,
        new Map([["src/routing/index.ts", indexContent]])
      );

      expect(result.length).toBe(1);
    });
  });

  describe("detectNewCliCommandsWithoutReadme", () => {
    it("should detect new CLI commands in bin/ without README update", () => {
      const changedFiles = ["bin/newcommand.ts"];
      const readmeUpdated = false;

      const result = detectNewCliCommandsWithoutReadme(changedFiles, readmeUpdated);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe("missing_readme_update");
      expect(result[0].message).toContain("command");
    });

    it("should not flag when README was updated", () => {
      const changedFiles = ["bin/newcommand.ts", "README.md"];
      const readmeUpdated = true;

      const result = detectNewCliCommandsWithoutReadme(changedFiles, readmeUpdated);

      expect(result.length).toBe(0);
    });

    it("should not flag when no bin/ files changed", () => {
      const changedFiles = ["src/utils.ts"];
      const readmeUpdated = false;

      const result = detectNewCliCommandsWithoutReadme(changedFiles, readmeUpdated);

      expect(result.length).toBe(0);
    });

    it("should detect multiple bin/ changes", () => {
      const changedFiles = ["bin/command1.ts", "bin/command2.ts"];
      const readmeUpdated = false;

      const result = detectNewCliCommandsWithoutReadme(changedFiles, readmeUpdated);

      expect(result.length).toBe(2);
    });
  });

  describe("runDocs", () => {
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
      mockSpawn(0, "src/clean.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => `
          /**
           * My documented function
           */
          export function documented() { return 1; }
        `,
      });

      expect(result.success).toBe(true);
      expect(result.issues?.length).toBe(0);
      expect(result.fixTasks).toHaveLength(0);
    });

    it("should return success:true for JSDoc issues only (advisory)", async () => {
      mockSpawn(0, "src/utils.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => `export function undocumented() { return 1; }`,
      });

      // JSDoc issues are advisory, so success is true
      expect(result.success).toBe(true);
      expect(result.missingJSDocCount).toBeGreaterThan(0);
    });

    it("should return success:false for README issues", async () => {
      mockSpawn(0, "src/index.ts\n");

      const result = await runDocs({
        readFile: async () => `export { newFunc } from "./new";`,
      });

      // README issues block, so success is false
      expect(result.success).toBe(false);
      expect(result.readmeNeedsUpdate).toBe(true);
    });

    it("should generate fix task for missing JSDoc", async () => {
      mockSpawn(0, "src/utils.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => `export function noDoc() { return 1; }`,
      });

      expect(result.fixTasks.length).toBeGreaterThan(0);
      expect(result.fixTasks[0].type).toBe("docs_fix");
      expect(result.fixTasks[0].description).toContain("JSDoc");
      expect(result.fixTasks[0].priority).toBe("low");
    });

    it("should generate fix task for missing README update", async () => {
      mockSpawn(0, "src/index.ts\n");

      const result = await runDocs({
        readFile: async () => `export { newFunc } from "./new";`,
      });

      expect(result.fixTasks.length).toBeGreaterThan(0);
      const readmeTask = result.fixTasks.find((t) =>
        t.description.includes("README")
      );
      expect(readmeTask).toBeDefined();
      expect(readmeTask?.priority).toBe("low");
    });

    it("should skip README check if README.md was updated", async () => {
      mockSpawn(0, "src/index.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => `export { newFunc } from "./new";`,
      });

      expect(result.readmeNeedsUpdate).toBe(false);
    });

    it("should not flag CLAUDE.md changes as README not updated", async () => {
      mockSpawn(0, "CLAUDE.md\n");

      const result = await runDocs({
        readFile: async () => `# Updated instructions`,
      });

      expect(result.readmeNeedsUpdate).toBe(false);
    });

    it("should not flag AGENTS.md changes as README not updated", async () => {
      mockSpawn(0, "AGENTS.md\n");

      const result = await runDocs({
        readFile: async () => `# Updated instructions`,
      });

      expect(result.readmeNeedsUpdate).toBe(false);
    });

    it("should include command in result", async () => {
      mockSpawn(0, "");

      const result = await runDocs({
        readFile: async () => "",
      });

      expect(result.command).toBe("git diff --name-only HEAD~1");
    });

    it("should include duration in result", async () => {
      mockSpawn(0, "");

      const result = await runDocs({
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

      await runDocs({
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

      const result = await runDocs({ readFile: async () => "" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Spawn failed");
    });

    it("should skip non-code files for JSDoc checks", async () => {
      mockSpawn(0, "README.md\npackage.json\n");

      const result = await runDocs({
        readFile: async () => "# README",
      });

      expect(result.missingJSDocCount).toBe(0);
    });

    it("should handle no changed files", async () => {
      mockSpawn(0, "");

      const result = await runDocs({
        readFile: async () => "",
      });

      expect(result.success).toBe(true);
      expect(result.scannedFiles).toBe(0);
    });

    it("should include readmeNeedsUpdate in result", async () => {
      mockSpawn(0, "src/utils.ts\n");

      const result = await runDocs({
        readFile: async () => "const x = 1;",
      });

      expect(result.readmeNeedsUpdate).toBeDefined();
    });

    it("should include missingJSDocCount in result", async () => {
      mockSpawn(0, "src/utils.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => "export function undoc() {}",
      });

      expect(result.missingJSDocCount).toBeDefined();
    });

    it("should include exportedFunctionsCount in result", async () => {
      mockSpawn(0, "src/utils.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => `
          /**
           * Documented
           */
          export function doc1() {}
          export function undoc1() {}
        `,
      });

      expect(result.exportedFunctionsCount).toBeDefined();
    });

    it("should include summary in result", async () => {
      mockSpawn(0, "src/utils.ts\n");

      const result = await runDocs({
        readFile: async () => "const x = 1;",
      });

      expect(result.summary).toBeDefined();
    });

    it("should detect bin/ changes requiring README update", async () => {
      mockSpawn(0, "bin/newcli.ts\n");

      const result = await runDocs({
        readFile: async () => `#!/usr/bin/env bun`,
      });

      expect(result.readmeNeedsUpdate).toBe(true);
      expect(result.success).toBe(false);
    });

    it("should skip JSDoc checks for test files", async () => {
      mockSpawn(0, "src/utils.test.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => `export function testHelper() {}`,
      });

      expect(result.missingJSDocCount).toBe(0);
    });

    it("should create correct fix task format for JSDoc", async () => {
      mockSpawn(0, "src/utils.ts\nREADME.md\n");

      const result = await runDocs({
        readFile: async () => `export function myFunc() { return 1; }`,
      });

      const jsdocTask = result.fixTasks.find((t) =>
        t.description.includes("JSDoc")
      );
      if (jsdocTask) {
        expect(jsdocTask.type).toBe("docs_fix");
        expect(jsdocTask.priority).toBe("low");
        expect(jsdocTask.file).toBe("src/utils.ts");
      }
    });
  });
});
