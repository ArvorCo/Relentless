/**
 * Unit tests for OpenCode Agent Adapter
 *
 * Tests for US-006: Add Model Selection Support to OpenCode Adapter
 *
 * @module tests/agents/opencode.test.ts
 */

import { describe, expect, it } from "bun:test";
import { opencodeAdapter } from "../../src/agents/opencode";

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
      (Bun as any).spawn = originalSpawn;
    },
  };
}

describe("OpenCode Adapter", () => {
  describe("invoke() model selection", () => {
    it("includes --model flag when options.model is provided", async () => {
      const mock = mockBunSpawn();

      try {
        await opencodeAdapter.invoke("test prompt", { model: "glm-4.7" });

        // Verify --model and model value are in args
        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("opencode/glm-4.7-free");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --model flag when options.model is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await opencodeAdapter.invoke("test prompt");

        // Verify --model is NOT in args
        expect(mock.capturedArgs).not.toContain("--model");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --model flag when options is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await opencodeAdapter.invoke("test prompt", undefined);

        // Verify --model is NOT in args
        expect(mock.capturedArgs).not.toContain("--model");
      } finally {
        mock.restore();
      }
    });

    it("includes --model with grok-code-fast-1 model", async () => {
      const mock = mockBunSpawn();

      try {
        await opencodeAdapter.invoke("test prompt", {
          model: "grok-code-fast-1",
        });

        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("opencode/grok-code");
      } finally {
        mock.restore();
      }
    });

    it("includes --model with minimax-m2.1 model", async () => {
      const mock = mockBunSpawn();

      try {
        await opencodeAdapter.invoke("test prompt", { model: "minimax-m2.1" });

        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("opencode/minimax-m2.1-free");
      } finally {
        mock.restore();
      }
    });

    it('argument order is correct: opencode run --model <model> "prompt"', async () => {
      const mock = mockBunSpawn();

      try {
        await opencodeAdapter.invoke("test prompt", { model: "glm-4.7" });

        // Expected order: opencode, run, --print-logs, --log-level, INFO, --model, opencode/glm-4.7-free, "test prompt"
        expect(mock.capturedArgs[0]).toBe("opencode");
        expect(mock.capturedArgs[1]).toBe("run");
        expect(mock.capturedArgs[2]).toBe("--print-logs");
        expect(mock.capturedArgs[3]).toBe("--log-level");
        expect(mock.capturedArgs[4]).toBe("INFO");
        expect(mock.capturedArgs[5]).toBe("--model");
        expect(mock.capturedArgs[6]).toBe("opencode/glm-4.7-free");
        expect(mock.capturedArgs[7]).toBe("test prompt");
      } finally {
        mock.restore();
      }
    });

    it('maintains correct order without model: opencode run "prompt"', async () => {
      const mock = mockBunSpawn();

      try {
        await opencodeAdapter.invoke("test prompt");

        // Expected order: opencode, run, --print-logs, --log-level, INFO, "test prompt"
        expect(mock.capturedArgs[0]).toBe("opencode");
        expect(mock.capturedArgs[1]).toBe("run");
        expect(mock.capturedArgs[2]).toBe("--print-logs");
        expect(mock.capturedArgs[3]).toBe("--log-level");
        expect(mock.capturedArgs[4]).toBe("INFO");
        expect(mock.capturedArgs[5]).toBe("test prompt");
      } finally {
        mock.restore();
      }
    });

    it("different models produce different command args", async () => {
      const models = ["glm-4.7", "grok-code-fast-1", "minimax-m2.1"];
      const expectedCliValues = [
        "opencode/glm-4.7-free",
        "opencode/grok-code",
        "opencode/minimax-m2.1-free",
      ];

      for (const [index, model] of models.entries()) {
        const mock = mockBunSpawn();

        try {
          await opencodeAdapter.invoke("test prompt", { model });

          expect(mock.capturedArgs).toContain("--model");
          expect(mock.capturedArgs).toContain(expectedCliValues[index]);
        } finally {
          mock.restore();
        }
      }
    });
  });

  describe("adapter properties", () => {
    it("has correct name", () => {
      expect(opencodeAdapter.name).toBe("opencode");
    });

    it("has correct displayName", () => {
      expect(opencodeAdapter.displayName).toBe("OpenCode");
    });

    it("has skill support enabled", () => {
      expect(opencodeAdapter.hasSkillSupport).toBe(true);
    });
  });

  describe("detectCompletion", () => {
    it("returns true when output contains <promise>COMPLETE</promise>", () => {
      const output = "Task done\n<promise>COMPLETE</promise>\nEnd";
      expect(opencodeAdapter.detectCompletion(output)).toBe(true);
    });

    it("returns false when output does not contain completion signal", () => {
      const output = "Task in progress...";
      expect(opencodeAdapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("detectRateLimit", () => {
    it("detects rate limit from rate limited message", () => {
      const output = "Error: rate limited - please wait";
      const result = opencodeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from try again later message", () => {
      const output = "Error: try again later";
      const result = opencodeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from quota exceeded message", () => {
      const output = "Error: quota exceeded for today";
      const result = opencodeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from 429 error code", () => {
      const output = "HTTP 429: Too Many Requests";
      const result = opencodeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("returns false for normal output", () => {
      const output = "Task completed successfully";
      const result = opencodeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(false);
    });
  });
});
