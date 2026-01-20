/**
 * Unit tests for Amp Agent Adapter
 *
 * Tests for US-007: Add Model Selection Support to Amp Adapter
 *
 * Amp uses the -m CLI flag for mode selection and -x for execute mode.
 *
 * @module tests/agents/amp.test.ts
 */

import { describe, expect, it } from "bun:test";
import { ampAdapter } from "../../src/agents/amp";

/**
 * Mock for Bun.spawn that captures spawn options
 */
interface SpawnCapture {
  capturedArgs: string[];
  capturedOptions: {
    cwd?: string;
  };
  restore: () => void;
}

/**
 * Mock Bun.spawn to capture CLI arguments
 */
function mockBunSpawn(): SpawnCapture {
  const capturedArgs: string[] = [];
  const capturedOptions: SpawnCapture["capturedOptions"] = {};
  const originalSpawn = Bun.spawn;

  // @ts-expect-error - mocking Bun.spawn
  Bun.spawn = (args: string[], options?: { cwd?: string }) => {
    capturedArgs.push(...args);
    capturedOptions.cwd = options?.cwd;

    return {
      stdout: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("mock output"));
          controller.close();
        },
      }),
      stderr: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      exited: Promise.resolve(0),
    };
  };

  return {
    capturedArgs,
    capturedOptions,
    restore: () => {
      // @ts-expect-error - restoring Bun.spawn
      Bun.spawn = originalSpawn;
    },
  };
}

describe("Amp Adapter", () => {
  describe("invoke() model selection via -m flag", () => {
    it("adds -m flag when options.model is provided", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", { model: "free" });

        // Verify -m and value are in args
        expect(mock.capturedArgs).toContain("-m");
        expect(mock.capturedArgs).toContain("free");
      } finally {
        mock.restore();
      }
    });

    it("does NOT add -m when options.model is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt");

        expect(mock.capturedArgs).not.toContain("-m");
      } finally {
        mock.restore();
      }
    });

    it("does NOT add -m when options is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", undefined);

        expect(mock.capturedArgs).not.toContain("-m");
      } finally {
        mock.restore();
      }
    });

    it("adds -m smart when model is 'smart'", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", { model: "smart" });

        expect(mock.capturedArgs).toContain("-m");
        expect(mock.capturedArgs).toContain("smart");
      } finally {
        mock.restore();
      }
    });

    it("supports both Amp modes: free and smart", async () => {
      const modes = ["free", "smart"];

      for (const mode of modes) {
        const mock = mockBunSpawn();

        try {
          await ampAdapter.invoke("test prompt", { model: mode });

          expect(mock.capturedArgs).toContain("-m");
          expect(mock.capturedArgs).toContain(mode);
        } finally {
          mock.restore();
        }
      }
    });
  });

  describe("invoke() basic functionality", () => {
    it("uses stdin for prompt input", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt");

        // amp command should be in the args
        expect(mock.capturedArgs).toContain("amp");
      } finally {
        mock.restore();
      }
    });

    it("includes --dangerously-allow-all flag when dangerouslyAllowAll option is true", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", { dangerouslyAllowAll: true });

        expect(mock.capturedArgs).toContain("--dangerously-allow-all");
      } finally {
        mock.restore();
      }
    });

    it("includes -x execute flag for non-interactive prompt", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt");

        expect(mock.capturedArgs).toContain("-x");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --dangerously-allow-all flag when option is false", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", { dangerouslyAllowAll: false });

        expect(mock.capturedArgs).not.toContain("--dangerously-allow-all");
      } finally {
        mock.restore();
      }
    });

    it("passes working directory to Bun.spawn", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", {
          workingDirectory: "/custom/path",
        });

        expect(mock.capturedOptions.cwd).toBe("/custom/path");
      } finally {
        mock.restore();
      }
    });
  });

  describe("adapter properties", () => {
    it("has correct name", () => {
      expect(ampAdapter.name).toBe("amp");
    });

    it("has correct displayName", () => {
      expect(ampAdapter.displayName).toBe("Amp");
    });

    it("has skill support enabled", () => {
      expect(ampAdapter.hasSkillSupport).toBe(true);
    });
  });

  describe("detectCompletion", () => {
    it("returns true when output contains <promise>COMPLETE</promise>", () => {
      const output = "Task done\n<promise>COMPLETE</promise>\nEnd";
      expect(ampAdapter.detectCompletion(output)).toBe(true);
    });

    it("returns false when output does not contain completion signal", () => {
      const output = "Task in progress...";
      expect(ampAdapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("detectRateLimit", () => {
    it("detects rate limit from quota exceeded message", () => {
      const output = "Error: quota exceeded for today";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from limit reached message", () => {
      const output = "Error: limit reached - please try again tomorrow";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from rate limit message", () => {
      const output = "Rate limit exceeded";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from too many requests message", () => {
      const output = "Error: too many requests";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects execute mode not permitted message", () => {
      const output = "Error: Execute mode is not permitted with --mode 'free'";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects amp CLI internal errors", () => {
      const output = "Error: Unexpected error inside Amp CLI.";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("returns false for normal output", () => {
      const output = "Task completed successfully";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(false);
    });

    it("includes message in rate limit info", () => {
      const output = "Rate limit exceeded";
      const result = ampAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
      expect(result.message).toBe("Amp rate limit exceeded");
    });
  });
});
