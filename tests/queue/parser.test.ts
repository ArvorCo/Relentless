/**
 * Queue Parser Tests
 *
 * This file tests the queue parsing functionality.
 * Following TDD: Write tests first, implementation comes in US-002.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createTempDir,
  createTestFile,
  readTestFile,
  fixtures,
  mockTimestamp,
} from "../helpers";

describe("Test Infrastructure", () => {
  describe("Test Helpers", () => {
    let tempDir: { path: string; cleanup: () => Promise<void> } | null = null;

    afterEach(async () => {
      if (tempDir) {
        await tempDir.cleanup();
        tempDir = null;
      }
    });

    it("should create and cleanup temp directories", async () => {
      tempDir = await createTempDir();

      expect(tempDir.path).toBeTruthy();
      expect(tempDir.path).toContain("relentless-test-");

      // Verify directory exists
      const file = Bun.file(tempDir.path);
      // Directory check - write a file to verify it works
      const testPath = `${tempDir.path}/test.txt`;
      await Bun.write(testPath, "test content");
      const testFile = Bun.file(testPath);
      expect(await testFile.exists()).toBe(true);
    });

    it("should create and read test files", async () => {
      tempDir = await createTempDir();
      const content = "test content\nline 2";

      const filePath = await createTestFile(tempDir.path, "test.txt", content);
      const readContent = await readTestFile(filePath);

      expect(readContent).toBe(content);
    });

    it("should generate mock timestamps in ISO format", () => {
      const timestamp = mockTimestamp();
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should generate valid queue line fixtures", () => {
      const content = "Please fix the bug in auth module";
      const queueLine = fixtures.validQueueLine(content);

      expect(queueLine).toContain(" | ");
      expect(queueLine).toContain(content);
      expect(queueLine).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should generate queue command fixtures", () => {
      expect(fixtures.queueCommand("PAUSE")).toBe("[PAUSE]");
      expect(fixtures.queueCommand("SKIP", "US-003")).toBe("[SKIP US-003]");
      expect(fixtures.queueCommand("PRIORITY", "US-001")).toBe(
        "[PRIORITY US-001]"
      );
    });
  });
});

describe("Queue Parser (placeholder for US-002)", () => {
  it("should be implemented in US-002", () => {
    // This test verifies the test infrastructure works
    // Actual parser tests will be added in US-002
    expect(true).toBe(true);
  });
});
