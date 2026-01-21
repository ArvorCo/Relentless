/**
 * Unit tests for Claude Code Agent Adapter
 *
 * Tests for US-003: Verify Claude Adapter Model Selection Support
 *
 * @module tests/agents/claude.test.ts
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";
import { claudeAdapter } from "../../src/agents/claude";
import type { InvokeOptions } from "../../src/agents/types";

/**
 * Test helper to capture spawn arguments.
 * We mock Bun.spawn to verify the correct CLI arguments are built.
 */
describe("Claude Adapter", () => {
  describe("invoke() model selection", () => {
    it("includes --model flag when options.model is provided", async () => {
      // Create a spy to capture spawn calls
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
        // Return a mock process
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

      try {
        await claudeAdapter.invoke("test prompt", { model: "opus-4.5" });

        // Verify --model and model value are in args
        expect(capturedArgs).toContain("--model");
        expect(capturedArgs).toContain("claude-opus-4-5-20251101");

        // Verify the order: claude, -p, --dangerously-skip-permissions (optional), --model, modelValue
        const modelIndex = capturedArgs.indexOf("--model");
        expect(modelIndex).toBeGreaterThan(0);
        expect(capturedArgs[modelIndex + 1]).toBe("claude-opus-4-5-20251101");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("does NOT include --model flag when options.model is undefined", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        await claudeAdapter.invoke("test prompt");

        // Verify --model is NOT in args
        expect(capturedArgs).not.toContain("--model");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("does NOT include --model flag when options is undefined", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        await claudeAdapter.invoke("test prompt", undefined);

        // Verify --model is NOT in args
        expect(capturedArgs).not.toContain("--model");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("includes --model with sonnet-4.5 model", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        await claudeAdapter.invoke("test prompt", { model: "sonnet-4.5" });

        expect(capturedArgs).toContain("--model");
        expect(capturedArgs).toContain("claude-sonnet-4-5-20250929");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("includes --model with haiku-4.5 model", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        await claudeAdapter.invoke("test prompt", { model: "haiku-4.5" });

        expect(capturedArgs).toContain("--model");
        expect(capturedArgs).toContain("claude-haiku-4-5-20251001");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("combines --model with --dangerously-skip-permissions", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        await claudeAdapter.invoke("test prompt", {
          model: "opus-4.5",
          dangerouslyAllowAll: true,
        });

        expect(capturedArgs).toContain("--model");
        expect(capturedArgs).toContain("claude-opus-4-5-20251101");
        expect(capturedArgs).toContain("--dangerously-skip-permissions");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("starts with 'claude' command", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        await claudeAdapter.invoke("test prompt", { model: "opus-4.5" });

        expect(capturedArgs[0]).toBe("claude");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });
  });

  describe("invokeStream() model selection", () => {
    it("includes --model flag when options.model is provided", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        // Consume the generator
        const generator = claudeAdapter.invokeStream!("test prompt", { model: "opus-4.5" });
        const chunks: string[] = [];
        let result;
        while (true) {
          const { done, value } = await generator.next();
          if (done) {
            result = value;
            break;
          }
          chunks.push(value);
        }

        // Verify --model and model value are in args
        expect(capturedArgs).toContain("--model");
        expect(capturedArgs).toContain("claude-opus-4-5-20251101");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("does NOT include --model flag when options.model is undefined", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        // Consume the generator
        const generator = claudeAdapter.invokeStream!("test prompt");
        while (true) {
          const { done } = await generator.next();
          if (done) break;
        }

        // Verify --model is NOT in args
        expect(capturedArgs).not.toContain("--model");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });

    it("combines --model with --dangerously-skip-permissions in stream mode", async () => {
      let capturedArgs: string[] = [];

      const originalSpawn = Bun.spawn;
      // @ts-expect-error - mocking Bun.spawn
      Bun.spawn = (args: string[], options?: { cwd?: string; stdin?: unknown; stdout?: string; stderr?: string }) => {
        capturedArgs = args as string[];
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

      try {
        const generator = claudeAdapter.invokeStream!("test prompt", {
          model: "sonnet-4.5",
          dangerouslyAllowAll: true,
        });
        while (true) {
          const { done } = await generator.next();
          if (done) break;
        }

        expect(capturedArgs).toContain("--model");
        expect(capturedArgs).toContain("claude-sonnet-4-5-20250929");
        expect(capturedArgs).toContain("--dangerously-skip-permissions");
      } finally {
        // @ts-expect-error - restoring Bun.spawn
        Bun.spawn = originalSpawn;
      }
    });
  });

  describe("adapter properties", () => {
    it("has correct name", () => {
      expect(claudeAdapter.name).toBe("claude");
    });

    it("has correct displayName", () => {
      expect(claudeAdapter.displayName).toBe("Claude Code");
    });

    it("has skill support enabled", () => {
      expect(claudeAdapter.hasSkillSupport).toBe(true);
    });
  });

  describe("detectCompletion", () => {
    it("returns true when output contains <promise>COMPLETE</promise>", () => {
      const output = "Task done\n<promise>COMPLETE</promise>\nEnd";
      expect(claudeAdapter.detectCompletion(output)).toBe(true);
    });

    it("returns false when output does not contain completion signal", () => {
      const output = "Task in progress...";
      expect(claudeAdapter.detectCompletion(output)).toBe(false);
    });
  });

  describe("detectRateLimit", () => {
    it("detects rate limit from Claude-specific message", () => {
      const output = "You've hit your limit · resets 12am (America/Sao_Paulo)";
      const result = claudeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
      expect(result.message).toBe("Claude Code rate limit exceeded");
    });

    it("detects rate limit case-insensitively", () => {
      const output = "you've hit your limit";
      const result = claudeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
    });

    it("parses reset time from message", () => {
      const output = "You've hit your limit · resets 12am (America/Sao_Paulo)";
      const result = claudeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(true);
      expect(result.resetTime).toBeDefined();
    });

    it("returns false for normal output", () => {
      const output = "Normal response";
      const result = claudeAdapter.detectRateLimit(output);
      expect(result.limited).toBe(false);
    });
  });
});
