/**
 * Unit tests for Droid Agent Adapter
 *
 * Tests for US-005: Add Model Selection Support to Droid Adapter
 *
 * @module tests/agents/droid.test.ts
 */

import { describe, expect, it } from "bun:test";
import { droidAdapter } from "../../src/agents/droid";

/**
 * Mock Bun.spawn to capture CLI arguments
 */
function mockBunSpawn(): { capturedArgs: string[]; restore: () => void } {
  const capturedArgs: string[] = [];
  const originalSpawn = Bun.spawn;

  // @ts-expect-error - mocking Bun.spawn
  Bun.spawn = (args: string[]) => {
    capturedArgs.push(...args);
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
    restore: () => {
      // @ts-expect-error - restoring Bun.spawn
      Bun.spawn = originalSpawn;
    },
  };
}

describe("Droid Adapter", () => {
  describe("invoke() model selection", () => {
    it("includes -m flag when options.model is provided", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt", { model: "glm-4.6" });

        // Verify -m and model value are in args
        expect(mock.capturedArgs).toContain("-m");
        expect(mock.capturedArgs).toContain("glm-4.6");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include -m flag when options.model is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt");

        // Verify -m is NOT in args
        expect(mock.capturedArgs).not.toContain("-m");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include -m flag when options is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt", undefined);

        // Verify -m is NOT in args
        expect(mock.capturedArgs).not.toContain("-m");
      } finally {
        mock.restore();
      }
    });

    it("includes -m with gemini-2.0-flash model", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt", { model: "gemini-2.0-flash" });

        expect(mock.capturedArgs).toContain("-m");
        expect(mock.capturedArgs).toContain("gemini-2.0-flash");
      } finally {
        mock.restore();
      }
    });

    it("includes -m with claude-3-5-sonnet model", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt", { model: "claude-3-5-sonnet" });

        expect(mock.capturedArgs).toContain("-m");
        expect(mock.capturedArgs).toContain("claude-3-5-sonnet");
      } finally {
        mock.restore();
      }
    });

    it("includes -m with gpt-4o model", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt", { model: "gpt-4o" });

        expect(mock.capturedArgs).toContain("-m");
        expect(mock.capturedArgs).toContain("gpt-4o");
      } finally {
        mock.restore();
      }
    });

    it("argument order is correct: droid exec -m <model> --auto high", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt", { model: "glm-4.6" });

        // Expected order: droid, exec, -m, glm-4.6, --auto, high
        expect(mock.capturedArgs[0]).toBe("droid");
        expect(mock.capturedArgs[1]).toBe("exec");
        expect(mock.capturedArgs[2]).toBe("-m");
        expect(mock.capturedArgs[3]).toBe("glm-4.6");
        expect(mock.capturedArgs[4]).toBe("--auto");
        expect(mock.capturedArgs[5]).toBe("high");
      } finally {
        mock.restore();
      }
    });

    it("maintains correct order without model: droid exec --auto high", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt");

        // Expected order: droid, exec, --auto, high
        expect(mock.capturedArgs[0]).toBe("droid");
        expect(mock.capturedArgs[1]).toBe("exec");
        expect(mock.capturedArgs[2]).toBe("--auto");
        expect(mock.capturedArgs[3]).toBe("high");
      } finally {
        mock.restore();
      }
    });

    it("uses short flag -m (not --model) per Droid CLI specification", async () => {
      const mock = mockBunSpawn();

      try {
        await droidAdapter.invoke("test prompt", { model: "glm-4.6" });

        // Verify -m is used, NOT --model
        expect(mock.capturedArgs).toContain("-m");
        expect(mock.capturedArgs).not.toContain("--model");
      } finally {
        mock.restore();
      }
    });
  });

  describe("adapter properties", () => {
    it("has correct name", () => {
      expect(droidAdapter.name).toBe("droid");
    });

    it("has correct displayName", () => {
      expect(droidAdapter.displayName).toBe("Factory Droid");
    });

    it("has skill support enabled", () => {
      expect(droidAdapter.hasSkillSupport).toBe(true);
    });
  });

  describe("detectCompletion", () => {
    it("returns true when output contains <promise>COMPLETE</promise>", () => {
      const output = "Task done\n<promise>COMPLETE</promise>\nEnd";
      expect(droidAdapter.detectCompletion(output)).toBe(true);
    });

    it("returns false when output does not contain completion signal", () => {
      const output = "Task in progress...";
      expect(droidAdapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("detectRateLimit", () => {
    it("detects rate limit from 429 error", () => {
      const output = "Error: 429 Too Many Requests";
      const result = droidAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from rate limit exceeded message", () => {
      const output = "Error: rate limit exceeded";
      const result = droidAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from quota exceeded message", () => {
      const output = "Error: quota exceeded";
      const result = droidAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from too many requests message", () => {
      const output = "Too many requests. Please wait and retry.";
      const result = droidAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("returns false for normal output", () => {
      const output = "Normal response";
      const result = droidAdapter.detectRateLimit(output);
      expect(result.limited).toBe(false);
    });
  });
});
