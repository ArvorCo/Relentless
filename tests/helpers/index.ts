/**
 * Test helper utilities for Relentless tests
 *
 * This module provides common utilities for writing tests including:
 * - Temp directory management
 * - File system helpers
 * - Mock data generators
 */

import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Creates a temporary directory for test isolation.
 * Returns cleanup function to remove the directory after test.
 */
export async function createTempDir(): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const path = await mkdtemp(join(tmpdir(), "relentless-test-"));
  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
    },
  };
}

/**
 * Creates a test file with given content in the specified directory.
 */
export async function createTestFile(
  dir: string,
  filename: string,
  content: string
): Promise<string> {
  const filePath = join(dir, filename);
  await writeFile(filePath, content, "utf-8");
  return filePath;
}

/**
 * Reads a test file and returns its content.
 */
export async function readTestFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

/**
 * Creates a nested directory structure for testing.
 */
export async function createTestDir(
  baseDir: string,
  relativePath: string
): Promise<string> {
  const fullPath = join(baseDir, relativePath);
  await mkdir(fullPath, { recursive: true });
  return fullPath;
}

/**
 * Waits for a specified amount of time (useful for async tests).
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a mock ISO timestamp for testing.
 */
export function mockTimestamp(date?: Date): string {
  return (date ?? new Date()).toISOString();
}

/**
 * Test fixture data for queue tests
 */
export const fixtures = {
  /** Sample valid queue line with timestamp */
  validQueueLine: (content: string, date?: Date): string =>
    `${mockTimestamp(date)} | ${content}`,

  /** Sample queue command */
  queueCommand: (command: string, arg?: string): string =>
    arg ? `[${command} ${arg}]` : `[${command}]`,

  /** Sample malformed queue line (no timestamp) */
  malformedQueueLine: "this is missing timestamp prefix",

  /** Sample empty line */
  emptyLine: "",

  /** Sample comment line */
  commentLine: "# this is a comment",
};
