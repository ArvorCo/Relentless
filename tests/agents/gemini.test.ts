/**
 * Unit tests for Gemini Agent Adapter
 *
 * Tests for US-008: Add Model Selection Support to Gemini Adapter
 *
 * Gemini CLI uses --model flag for model selection and --yolo for
 * dangerous mode (skip permissions).
 *
 * @module tests/agents/gemini.test.ts
 */

import { describe, expect, it } from "bun:test";
import { geminiAdapter } from "../../src/agents/gemini";

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

describe("Gemini Adapter", () => {
  describe("invoke() model selection", () => {
    it("includes --model flag when options.model is provided", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", { model: "gemini-3-pro" });

        // Verify --model and model value are in args
        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("gemini-3-pro");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --model flag when options.model is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt");

        // Verify --model is NOT in args
        expect(mock.capturedArgs).not.toContain("--model");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --model flag when options is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", undefined);

        // Verify --model is NOT in args
        expect(mock.capturedArgs).not.toContain("--model");
      } finally {
        mock.restore();
      }
    });

    it("includes --model with gemini-3-flash model", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", { model: "gemini-3-flash" });

        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("gemini-3-flash");
      } finally {
        mock.restore();
      }
    });

    it('argument order is correct: gemini [--yolo] [--model <model>] "<prompt>"', async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", { model: "gemini-3-pro" });

        // Expected order: gemini, --model, gemini-3-pro, "test prompt"
        expect(mock.capturedArgs[0]).toBe("gemini");
        expect(mock.capturedArgs[1]).toBe("--model");
        expect(mock.capturedArgs[2]).toBe("gemini-3-pro");
        expect(mock.capturedArgs[3]).toBe("test prompt");
      } finally {
        mock.restore();
      }
    });

    it('maintains correct order without model: gemini "<prompt>"', async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt");

        // Expected order: gemini, "test prompt"
        expect(mock.capturedArgs[0]).toBe("gemini");
        expect(mock.capturedArgs[1]).toBe("test prompt");
      } finally {
        mock.restore();
      }
    });

    it("different models produce different command args", async () => {
      const models = ["gemini-3-pro", "gemini-3-flash"];

      for (const model of models) {
        const mock = mockBunSpawn();

        try {
          await geminiAdapter.invoke("test prompt", { model });

          expect(mock.capturedArgs).toContain("--model");
          expect(mock.capturedArgs).toContain(model);
        } finally {
          mock.restore();
        }
      }
    });
  });

  describe("invoke() --yolo flag (dangerous mode)", () => {
    it("includes --yolo flag when dangerouslyAllowAll is true", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", { dangerouslyAllowAll: true });

        expect(mock.capturedArgs).toContain("--yolo");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --yolo flag when dangerouslyAllowAll is false", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", {
          dangerouslyAllowAll: false,
        });

        expect(mock.capturedArgs).not.toContain("--yolo");
      } finally {
        mock.restore();
      }
    });

    it("does NOT include --yolo flag when dangerouslyAllowAll is undefined", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt");

        expect(mock.capturedArgs).not.toContain("--yolo");
      } finally {
        mock.restore();
      }
    });
  });

  describe("invoke() combined --model and --yolo flags", () => {
    it("includes both --yolo and --model flags when both options are provided", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", {
          dangerouslyAllowAll: true,
          model: "gemini-3-pro",
        });

        expect(mock.capturedArgs).toContain("--yolo");
        expect(mock.capturedArgs).toContain("--model");
        expect(mock.capturedArgs).toContain("gemini-3-pro");
      } finally {
        mock.restore();
      }
    });

    it("maintains correct argument order with both flags: gemini --yolo --model <model> <prompt>", async () => {
      const mock = mockBunSpawn();

      try {
        await geminiAdapter.invoke("test prompt", {
          dangerouslyAllowAll: true,
          model: "gemini-3-flash",
        });

        // Expected order: gemini, --yolo, --model, gemini-3-flash, "test prompt"
        expect(mock.capturedArgs[0]).toBe("gemini");
        expect(mock.capturedArgs[1]).toBe("--yolo");
        expect(mock.capturedArgs[2]).toBe("--model");
        expect(mock.capturedArgs[3]).toBe("gemini-3-flash");
        expect(mock.capturedArgs[4]).toBe("test prompt");
      } finally {
        mock.restore();
      }
    });
  });

  describe("adapter properties", () => {
    it("has correct name", () => {
      expect(geminiAdapter.name).toBe("gemini");
    });

    it("has correct displayName", () => {
      expect(geminiAdapter.displayName).toBe("Gemini CLI");
    });

    it("has skill support enabled", () => {
      expect(geminiAdapter.hasSkillSupport).toBe(true);
    });

    it("has skill install command for extensions", () => {
      expect(geminiAdapter.skillInstallCommand).toContain("extensions install");
    });
  });

  describe("detectCompletion", () => {
    it("returns true when output contains <promise>COMPLETE</promise>", () => {
      const output = "Task done\n<promise>COMPLETE</promise>\nEnd";
      expect(geminiAdapter.detectCompletion(output)).toBe(true);
    });

    it("returns false when output does not contain completion signal", () => {
      const output = "Task in progress...";
      expect(geminiAdapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("detectRateLimit", () => {
    it("detects rate limit from quota exceeded message", () => {
      const output = "Error: quota exceeded for today";
      const result = geminiAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from resource exhausted message", () => {
      const output = "Error: resource exhausted - please wait";
      const result = geminiAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from rate limit message", () => {
      const output = "Rate limit exceeded";
      const result = geminiAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from 429 error code", () => {
      const output = "HTTP 429: Too Many Requests";
      const result = geminiAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("detects rate limit from too many requests message", () => {
      const output = "Error: too many requests";
      const result = geminiAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("returns false for normal output", () => {
      const output = "Task completed successfully";
      const result = geminiAdapter.detectRateLimit(output);
      expect(result.limited).toBe(false);
    });

    it("includes message in rate limit info", () => {
      const output = "Rate limit exceeded";
      const result = geminiAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
      expect(result.message).toBe("Gemini rate limit exceeded");
    });
  });
});
