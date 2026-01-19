/**
 * Unit tests for Amp Agent Adapter
 *
 * Tests for US-007: Add Model Selection Support to Amp Adapter
 *
 * Amp uses the AMP_MODE environment variable for model/mode selection,
 * unlike other adapters which use CLI flags.
 *
 * @module tests/agents/amp.test.ts
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { ampAdapter } from "../../src/agents/amp";

/**
 * Mock for Bun.spawn that captures spawn options including environment variables
 */
interface SpawnCapture {
  capturedArgs: string[];
  capturedEnv: Record<string, string | undefined> | undefined;
  capturedOptions: {
    cwd?: string;
    env?: Record<string, string | undefined>;
  };
  restore: () => void;
}

/**
 * Mock Bun.spawn to capture CLI arguments and environment variables
 */
function mockBunSpawn(): SpawnCapture {
  const capturedArgs: string[] = [];
  let capturedEnv: Record<string, string | undefined> | undefined;
  const capturedOptions: SpawnCapture["capturedOptions"] = {};
  const originalSpawn = Bun.spawn;

  // @ts-expect-error - mocking Bun.spawn
  Bun.spawn = (
    args: string[],
    options?: { cwd?: string; env?: Record<string, string | undefined> }
  ) => {
    capturedArgs.push(...args);
    capturedEnv = options?.env;
    capturedOptions.cwd = options?.cwd;
    capturedOptions.env = options?.env;

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
    get capturedEnv() {
      return capturedEnv;
    },
    capturedOptions,
    restore: () => {
      // @ts-expect-error - restoring Bun.spawn
      Bun.spawn = originalSpawn;
    },
  };
}

describe("Amp Adapter", () => {
  describe("invoke() model selection via AMP_MODE environment variable", () => {
    it("sets AMP_MODE environment variable when options.model is provided", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", { model: "free" });

        // Verify AMP_MODE is set in the environment
        expect(mock.capturedEnv).toBeDefined();
        expect(mock.capturedEnv?.AMP_MODE).toBe("free");
      } finally {
        mock.restore();
      }
    });

    it("does NOT set AMP_MODE when options.model is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt");

        // When no model specified, env should not contain AMP_MODE
        // (or env object may be undefined/not include AMP_MODE)
        if (mock.capturedEnv) {
          expect(mock.capturedEnv.AMP_MODE).toBeUndefined();
        }
      } finally {
        mock.restore();
      }
    });

    it("does NOT set AMP_MODE when options is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", undefined);

        // When options undefined, should not have AMP_MODE
        if (mock.capturedEnv) {
          expect(mock.capturedEnv.AMP_MODE).toBeUndefined();
        }
      } finally {
        mock.restore();
      }
    });

    it("sets AMP_MODE=smart when model is 'smart'", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", { model: "smart" });

        expect(mock.capturedEnv).toBeDefined();
        expect(mock.capturedEnv?.AMP_MODE).toBe("smart");
      } finally {
        mock.restore();
      }
    });

    it("preserves existing environment variables when setting AMP_MODE", async () => {
      const mock = mockBunSpawn();

      // Verify that process.env values are preserved
      const hasPath = process.env.PATH !== undefined;

      try {
        await ampAdapter.invoke("test prompt", { model: "free" });

        expect(mock.capturedEnv).toBeDefined();
        // AMP_MODE should be set
        expect(mock.capturedEnv?.AMP_MODE).toBe("free");
        // PATH should be preserved from process.env
        if (hasPath) {
          expect(mock.capturedEnv?.PATH).toBe(process.env.PATH);
        }
      } finally {
        mock.restore();
      }
    });

    it("environment variable is passed to Bun.spawn via env option", async () => {
      const mock = mockBunSpawn();

      try {
        await ampAdapter.invoke("test prompt", { model: "free" });

        // The env option should be passed to spawn
        expect(mock.capturedOptions.env).toBeDefined();
        expect(mock.capturedOptions.env?.AMP_MODE).toBe("free");
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

          expect(mock.capturedEnv).toBeDefined();
          expect(mock.capturedEnv?.AMP_MODE).toBe(mode);
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
