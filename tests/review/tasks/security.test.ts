/**
 * Tests for the Security Micro-Task
 *
 * Tests the security micro-task that scans for OWASP top issues
 * and generates fix tasks for critical/high vulnerabilities.
 *
 * @module tests/review/tasks/security.test.ts
 */

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
} from "bun:test";
import {
  runSecurity,
  scanFileForVulnerabilities,
  type Vulnerability,
  type SecurityResult,
  type VulnerabilityType,
  type VulnerabilitySeverity,
} from "../../../src/review/tasks/security";
import type { FixTask } from "../../../src/review/types";

describe("Security Micro-Task", () => {
  describe("scanFileForVulnerabilities", () => {
    it("should detect hardcoded password", () => {
      const content = `
        const password = "secret123";
        const pwd = "mypassword";
        const PASSWORD = "hunter2";
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/config.ts"
      );

      const passwordIssues = vulnerabilities.filter(
        (v) => v.type === "hardcoded_password"
      );
      expect(passwordIssues.length).toBeGreaterThanOrEqual(1);
      expect(passwordIssues[0].severity).toBe("critical");
    });

    it("should detect hardcoded API key", () => {
      const content = `
        const apiKey = "sk-abc123def456";
        const API_KEY = "AIzaSyB1234567890";
        const secret = "ghp_abcdefghijklmnop";
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/api.ts"
      );

      const apiKeyIssues = vulnerabilities.filter(
        (v) => v.type === "hardcoded_api_key"
      );
      expect(apiKeyIssues.length).toBeGreaterThanOrEqual(1);
      expect(apiKeyIssues[0].severity).toBe("critical");
    });

    it("should detect unsafe eval()", () => {
      const content = `
        const result = eval(userInput);
        const fn = new Function(code);
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/parser.ts"
      );

      const evalIssues = vulnerabilities.filter(
        (v) => v.type === "unsafe_eval"
      );
      expect(evalIssues.length).toBeGreaterThanOrEqual(1);
      expect(evalIssues[0].severity).toBe("high");
    });

    it("should detect innerHTML assignment", () => {
      const content = `
        element.innerHTML = userContent;
        document.body.innerHTML = htmlString;
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/ui.ts"
      );

      const xssIssues = vulnerabilities.filter((v) => v.type === "xss_risk");
      expect(xssIssues.length).toBeGreaterThanOrEqual(1);
      expect(xssIssues[0].severity).toBe("high");
    });

    it("should detect exec() with string concatenation", () => {
      const content = `
        exec("rm -rf " + userPath);
        exec(\`ls \${directory}\`);
        spawn("sh", ["-c", command]);
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/shell.ts"
      );

      const execIssues = vulnerabilities.filter(
        (v) => v.type === "command_injection_risk"
      );
      expect(execIssues.length).toBeGreaterThanOrEqual(1);
      expect(execIssues[0].severity).toBe("high");
    });

    it("should detect SQL string concatenation", () => {
      const content = `
        const query = "SELECT * FROM users WHERE id = " + id;
        db.query(\`DELETE FROM \${table}\`);
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/db.ts"
      );

      const sqlIssues = vulnerabilities.filter(
        (v) => v.type === "sql_injection_risk"
      );
      expect(sqlIssues.length).toBeGreaterThanOrEqual(1);
      expect(sqlIssues[0].severity).toBe("critical");
    });

    it("should return empty array for clean file", () => {
      const content = `
        const config = process.env.API_KEY;
        const query = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/safe.ts"
      );

      expect(vulnerabilities).toHaveLength(0);
    });

    it("should report test files with severity info only", () => {
      const content = `
        const password = "testpassword";
        eval("2 + 2");
      `;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "tests/unit/auth.test.ts"
      );

      // Test files should have severity downgraded to info
      for (const vuln of vulnerabilities) {
        expect(vuln.severity).toBe("info");
      }
    });

    it("should include line number in vulnerability", () => {
      const content = `line 1
line 2
const password = "secret";
line 4`;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/config.ts"
      );

      expect(vulnerabilities[0].line).toBe(3);
    });

    it("should include OWASP category", () => {
      const content = `const password = "secret";`;
      const vulnerabilities = scanFileForVulnerabilities(
        content,
        "src/config.ts"
      );

      expect(vulnerabilities[0].owaspCategory).toBeDefined();
    });
  });

  describe("runSecurity", () => {
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

    const mockSpawnSequence = (calls: Array<{ exitCode: number; stdout: string; stderr: string }>) => {
      let callIndex = 0;
      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => {
        const call = calls[callIndex] || calls[calls.length - 1];
        callIndex++;
        return {
          exited: Promise.resolve(call.exitCode),
          stdout: {
            text: () => Promise.resolve(call.stdout),
          },
          stderr: {
            text: () => Promise.resolve(call.stderr),
          },
        };
      };
    };

    it("should return success:true with no vulnerabilities for clean files", async () => {
      mockSpawnSequence([
        // git diff
        { exitCode: 0, stdout: "src/safe.ts\n", stderr: "" },
        // file read
        { exitCode: 0, stdout: "const x = 1;", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => "const x = 1;",
      });

      expect(result.success).toBe(true);
      expect(result.vulnerabilities?.length).toBe(0);
      expect(result.fixTasks).toHaveLength(0);
    });

    it("should return success:false when vulnerabilities found", async () => {
      mockSpawnSequence([
        // git diff
        { exitCode: 0, stdout: "src/config.ts\n", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => 'const password = "secret123";',
      });

      expect(result.success).toBe(false);
      expect(result.vulnerabilities?.length).toBeGreaterThan(0);
    });

    it("should generate fix tasks for critical/high vulnerabilities", async () => {
      mockSpawnSequence([
        // git diff
        { exitCode: 0, stdout: "src/config.ts\n", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => 'const password = "secret"; eval(code);',
      });

      expect(result.fixTasks.length).toBeGreaterThanOrEqual(1);
      expect(result.fixTasks[0].type).toBe("security_fix");
      expect(result.fixTasks[0].priority).toBe("critical");
    });

    it("should not generate fix tasks for medium/low/info issues", async () => {
      mockSpawnSequence([
        // git diff
        { exitCode: 0, stdout: "tests/config.test.ts\n", stderr: "" },
      ]);

      // Test file with issues - should be downgraded to info
      const result = await runSecurity({
        readFile: async () => 'const password = "testpassword";',
      });

      // Test files have severity "info", so no fix tasks
      expect(result.fixTasks).toHaveLength(0);
    });

    it("should report total files scanned", async () => {
      mockSpawnSequence([
        // git diff
        { exitCode: 0, stdout: "src/a.ts\nsrc/b.ts\nsrc/c.ts\n", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => "const x = 1;",
      });

      expect(result.scannedFiles).toBe(3);
    });

    it("should include issues by severity breakdown", async () => {
      mockSpawnSequence([
        // git diff
        { exitCode: 0, stdout: "src/config.ts\n", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => 'const password = "secret"; eval(code);',
      });

      expect(result.summary).toContain("critical");
      expect(result.summary).toContain("high");
    });

    it("should include OWASP category breakdown", async () => {
      mockSpawnSequence([
        // git diff
        { exitCode: 0, stdout: "src/config.ts\n", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => 'const password = "secret";',
      });

      expect(result.vulnerabilities?.[0].owaspCategory).toBeDefined();
    });

    it("should include command in result", async () => {
      mockSpawnSequence([
        { exitCode: 0, stdout: "", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => "",
      });

      expect(result.command).toBe("git diff --name-only HEAD~1");
    });

    it("should include duration in result", async () => {
      mockSpawnSequence([
        { exitCode: 0, stdout: "", stderr: "" },
      ]);

      const result = await runSecurity({
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

      await runSecurity({ cwd: "/custom/path", readFile: async () => "" });

      expect(capturedCwd).toBe("/custom/path");
    });

    it("should handle exception during command execution", async () => {
      // @ts-expect-error - Mock Bun.spawn to throw
      Bun.spawn = () => {
        throw new Error("Spawn failed");
      };

      const result = await runSecurity({ readFile: async () => "" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Spawn failed");
    });

    it("should run in fresh session with only security prompt", async () => {
      let callCount = 0;

      // @ts-expect-error - Mock Bun.spawn
      Bun.spawn = () => {
        callCount++;
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

      await runSecurity({ readFile: async () => "" });
      await runSecurity({ readFile: async () => "" });

      expect(callCount).toBe(2);
    });

    it("should skip non-code files", async () => {
      mockSpawnSequence([
        { exitCode: 0, stdout: "README.md\npackage.json\n.gitignore\n", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => 'const password = "secret";',
      });

      // Non-code files should be skipped
      expect(result.scannedFiles).toBe(0);
    });

    it("should handle no changed files", async () => {
      mockSpawnSequence([
        { exitCode: 0, stdout: "", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => "",
      });

      expect(result.success).toBe(true);
      expect(result.scannedFiles).toBe(0);
    });

    it("should create correct fix task format", async () => {
      mockSpawnSequence([
        { exitCode: 0, stdout: "src/config.ts\n", stderr: "" },
      ]);

      const result = await runSecurity({
        readFile: async () => 'const password = "secret123";',
      });

      expect(result.fixTasks[0]).toEqual({
        type: "security_fix",
        file: "src/config.ts",
        line: expect.any(Number),
        description: expect.stringContaining("hardcoded"),
        priority: "critical",
      });
    });
  });
});
