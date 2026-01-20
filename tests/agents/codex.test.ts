/**
 * Unit tests for Codex Agent Adapter
 *
 * Tests for US-004: Add Model Selection Support to Codex Adapter
 *
 * @module tests/agents/codex.test.ts
 */

import { describe, expect, it } from "bun:test";
import { codexAdapter } from "../../src/agents/codex";

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

describe("Codex Adapter", () => {
  describe("invoke() model selection", () => {
    it("includes --model flag when options.model is provided", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt", { model: "gpt-5.2-high" });

        // Verify --model and model value are in args
        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("gpt-5.2");
        expect(mock.capturedArgs).toContain("-c");
        expect(mock.capturedArgs).toContain("reasoning_effort=\"high\"");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --model flag when options.model is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt");

        // Verify --model is NOT in args
        expect(mock.capturedArgs).not.toContain("--model");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --model flag when options is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt", undefined);

        // Verify --model is NOT in args
        expect(mock.capturedArgs).not.toContain("--model");
      } finally {
        mock.restore();
      }
    });

    it("includes --model with gpt-5.2-medium model", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt", { model: "gpt-5.2-medium" });

        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("gpt-5.2");
        expect(mock.capturedArgs).toContain("-c");
        expect(mock.capturedArgs).toContain("reasoning_effort=\"medium\"");
      } finally {
        mock.restore();
      }
    });

    it("includes --model with gpt-5.2-low model", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt", { model: "gpt-5.2-low" });

        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("gpt-5.2");
        expect(mock.capturedArgs).toContain("-c");
        expect(mock.capturedArgs).toContain("reasoning_effort=\"low\"");
      } finally {
        mock.restore();
      }
    });

    it("includes --model with gpt-5.2-xhigh model", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt", { model: "gpt-5.2-xhigh" });

        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("gpt-5.2");
        expect(mock.capturedArgs).toContain("-c");
        expect(mock.capturedArgs).toContain("reasoning_effort=\"xhigh\"");
      } finally {
        mock.restore();
      }
    });

    it("argument order is correct: codex exec --model gpt-5.2 -c reasoning_effort=\"<tier>\" -", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt", { model: "gpt-5.2-high" });

        // Expected order: codex, exec, --model, gpt-5.2, -c, reasoning_effort="high", -
        expect(mock.capturedArgs[0]).toBe("codex");
        expect(mock.capturedArgs[1]).toBe("exec");
        expect(mock.capturedArgs[2]).toBe("--model");
        expect(mock.capturedArgs[3]).toBe("gpt-5.2");
        expect(mock.capturedArgs[4]).toBe("-c");
        expect(mock.capturedArgs[5]).toBe("reasoning_effort=\"high\"");
        expect(mock.capturedArgs[6]).toBe("-");
      } finally {
        mock.restore();
      }
    });

    it("maintains correct order without model: codex exec -", async () => {
      const mock = mockBunSpawn();

      try {
        await codexAdapter.invoke("test prompt");

        // Expected order: codex, exec, -
        expect(mock.capturedArgs[0]).toBe("codex");
        expect(mock.capturedArgs[1]).toBe("exec");
        expect(mock.capturedArgs[2]).toBe("-");
      } finally {
        mock.restore();
      }
    });
  });

  describe("adapter properties", () => {
    it("has correct name", () => {
      expect(codexAdapter.name).toBe("codex");
    });

    it("has correct displayName", () => {
      expect(codexAdapter.displayName).toBe("OpenAI Codex");
    });

    it("has skill support enabled", () => {
      expect(codexAdapter.hasSkillSupport).toBe(true);
    });
  });

  describe("detectCompletion", () => {
    it("returns true when output contains <promise>COMPLETE</promise>", () => {
      const output = "Task done\n<promise>COMPLETE</promise>\nEnd";
      expect(codexAdapter.detectCompletion(output)).toBe(true);
    });

    it("returns false when output does not contain completion signal", () => {
      const output = "Task in progress...";
      expect(codexAdapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("detectRateLimit", () => {
    it("detects rate limit from 429 error", () => {
      const output = "Error: 429 Too Many Requests";
      const result = codexAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from rate limit exceeded message", () => {
      const output = "Error: rate limit exceeded";
      const result = codexAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from quota exceeded message", () => {
      const output = "Error: quota exceeded";
      const result = codexAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from too many requests message", () => {
      const output = "Too many requests. Please wait and retry.";
      const result = codexAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects session permission errors", () => {
      const output =
        "Error: Fatal error: Codex cannot access session files at /Users/test/.codex/sessions (permission denied).";
      const result = codexAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("returns false for normal output", () => {
      const output = "Normal response";
      const result = codexAdapter.detectRateLimit(output);
      expect(result.limited).toBe(false);
    });
  });
});
