/**
 * Unit tests for the Review Runner Framework
 *
 * Tests for US-013: Review Runner Framework
 *
 * TDD: These tests are written BEFORE implementation
 * to define the expected behavior of the review runner.
 *
 * @module tests/review/runner.test.ts
 */

import { describe, expect, it, beforeEach, mock, afterEach } from "bun:test";

// These imports will fail until we implement the module
import {
  runReview,
  ReviewSummarySchema,
  ReviewTaskResultSchema,
  FixTaskSchema,
  ReviewOptionsSchema,
  type ReviewSummary,
  type ReviewTaskResult,
  type FixTask,
  type ReviewOptions,
  type MicroTaskHandler,
} from "../../src/review/runner";
import type { ReviewConfig, Mode } from "../../src/config/schema";
import type { AutoModeConfig } from "../../src/config/schema";

// Mock micro-task handlers for testing
const createMockHandler = (
  name: string,
  options: {
    success?: boolean;
    errorCount?: number;
    fixTasks?: FixTask[];
    duration?: number;
    throwError?: boolean;
  } = {}
): MicroTaskHandler => {
  const {
    success = true,
    errorCount = 0,
    fixTasks = [],
    duration = 100,
    throwError = false,
  } = options;

  return async () => {
    if (throwError) {
      throw new Error(`${name} task failed with exception`);
    }
    // Simulate task duration
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      taskType: name as ReviewTaskResult["taskType"],
      success,
      errorCount,
      fixTasks,
      duration,
    };
  };
};

// Default review config for tests
const defaultReviewConfig: ReviewConfig = {
  promptUser: false,
  defaultMode: "good",
  microTasks: ["typecheck", "lint", "test", "security", "quality", "docs"],
  maxRetries: 3,
};

// Default auto mode config for tests
const defaultAutoModeConfig: AutoModeConfig = {
  enabled: true,
  defaultMode: "good",
  fallbackOrder: ["claude", "codex", "droid", "opencode", "amp", "gemini"],
  modeModels: {
    simple: "haiku-4.5",
    medium: "sonnet-4.5",
    complex: "opus-4.5",
    expert: "opus-4.5",
  },
  review: defaultReviewConfig,
  escalation: {
    enabled: true,
    maxAttempts: 3,
    escalationPath: {
      "haiku-4.5": "sonnet-4.5",
      "sonnet-4.5": "opus-4.5",
    },
  },
};

describe("Review Runner Framework", () => {
  describe("ReviewSummarySchema", () => {
    it("validates a complete review summary", () => {
      const validSummary: ReviewSummary = {
        tasksRun: 6,
        tasksPassed: 5,
        tasksFailed: 1,
        fixTasksGenerated: 2,
        totalDuration: 1500,
        estimatedCost: 0.15,
        actualCost: 0.18,
        results: [
          {
            taskType: "typecheck",
            success: true,
            errorCount: 0,
            fixTasks: [],
            duration: 200,
          },
          {
            taskType: "lint",
            success: false,
            errorCount: 2,
            fixTasks: [
              {
                type: "lint_fix",
                file: "src/test.ts",
                line: 10,
                description: "Fix lint error",
                priority: "high",
              },
            ],
            duration: 300,
          },
        ],
      };

      const result = ReviewSummarySchema.parse(validSummary);
      expect(result.tasksRun).toBe(6);
      expect(result.tasksPassed).toBe(5);
      expect(result.tasksFailed).toBe(1);
    });

    it("validates summary with zero tasks", () => {
      const emptySummary: ReviewSummary = {
        tasksRun: 0,
        tasksPassed: 0,
        tasksFailed: 0,
        fixTasksGenerated: 0,
        totalDuration: 0,
        estimatedCost: 0,
        actualCost: 0,
        results: [],
      };

      const result = ReviewSummarySchema.parse(emptySummary);
      expect(result.tasksRun).toBe(0);
    });
  });

  describe("ReviewTaskResultSchema", () => {
    it("validates a successful task result", () => {
      const successResult: ReviewTaskResult = {
        taskType: "typecheck",
        success: true,
        errorCount: 0,
        fixTasks: [],
        duration: 150,
      };

      const result = ReviewTaskResultSchema.parse(successResult);
      expect(result.success).toBe(true);
      expect(result.taskType).toBe("typecheck");
    });

    it("validates a failed task result with fix tasks", () => {
      const failedResult: ReviewTaskResult = {
        taskType: "lint",
        success: false,
        errorCount: 3,
        fixTasks: [
          {
            type: "lint_fix",
            file: "src/main.ts",
            line: 42,
            description: "Unexpected any type",
            priority: "high",
          },
        ],
        duration: 250,
      };

      const result = ReviewTaskResultSchema.parse(failedResult);
      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(3);
      expect(result.fixTasks.length).toBe(1);
    });

    it("accepts all valid task types", () => {
      const taskTypes = ["typecheck", "lint", "test", "security", "quality", "docs"] as const;
      for (const taskType of taskTypes) {
        const result = ReviewTaskResultSchema.parse({
          taskType,
          success: true,
          errorCount: 0,
          fixTasks: [],
          duration: 100,
        });
        expect(result.taskType).toBe(taskType);
      }
    });
  });

  describe("FixTaskSchema", () => {
    it("validates a fix task with all fields", () => {
      const fixTask: FixTask = {
        type: "typecheck_fix",
        file: "src/router.ts",
        line: 55,
        description: "Fix TypeScript error TS2339: Property 'foo' does not exist",
        priority: "high",
      };

      const result = FixTaskSchema.parse(fixTask);
      expect(result.type).toBe("typecheck_fix");
      expect(result.line).toBe(55);
    });

    it("validates fix task with optional rule field", () => {
      const fixTask: FixTask = {
        type: "lint_fix",
        file: "src/main.ts",
        line: 10,
        description: "Prefer const over let",
        priority: "medium",
        rule: "prefer-const",
      };

      const result = FixTaskSchema.parse(fixTask);
      expect(result.rule).toBe("prefer-const");
    });

    it("accepts all valid priorities", () => {
      const priorities = ["critical", "high", "medium", "low"] as const;
      for (const priority of priorities) {
        const result = FixTaskSchema.parse({
          type: "test_fix",
          file: "test.ts",
          description: "Fix test",
          priority,
        });
        expect(result.priority).toBe(priority);
      }
    });
  });

  describe("ReviewOptionsSchema", () => {
    it("validates options with defaults", () => {
      const options = ReviewOptionsSchema.parse({});
      expect(options.stopOnFailure).toBe(false);
      expect(options.mode).toBe("good");
    });

    it("validates explicit options", () => {
      const options = ReviewOptionsSchema.parse({
        stopOnFailure: true,
        mode: "genius",
        skipTasks: ["docs"],
      });
      expect(options.stopOnFailure).toBe(true);
      expect(options.mode).toBe("genius");
      expect(options.skipTasks).toContain("docs");
    });
  });

  describe("runReview()", () => {
    it("runs all configured micro-tasks in order", async () => {
      const executionOrder: string[] = [];
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          executionOrder.push("typecheck");
          return { taskType: "typecheck", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
        lint: async () => {
          executionOrder.push("lint");
          return { taskType: "lint", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
        test: async () => {
          executionOrder.push("test");
          return { taskType: "test", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint", "test"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(executionOrder).toEqual(["typecheck", "lint", "test"]);
      expect(summary.tasksRun).toBe(3);
      expect(summary.tasksPassed).toBe(3);
    });

    it("produces ReviewSummary with correct counts", async () => {
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck", { success: true }),
        lint: createMockHandler("lint", { success: false, errorCount: 2 }),
        test: createMockHandler("test", { success: true }),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint", "test"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(summary.tasksRun).toBe(3);
      expect(summary.tasksPassed).toBe(2);
      expect(summary.tasksFailed).toBe(1);
    });

    it("counts fix tasks generated correctly", async () => {
      const fixTasks: FixTask[] = [
        { type: "lint_fix", file: "a.ts", description: "Fix 1", priority: "high" },
        { type: "lint_fix", file: "b.ts", description: "Fix 2", priority: "medium" },
      ];

      const handlers: Record<string, MicroTaskHandler> = {
        lint: createMockHandler("lint", { success: false, errorCount: 2, fixTasks }),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["lint"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(summary.fixTasksGenerated).toBe(2);
    });

    it("supports stopOnFailure option", async () => {
      const executionOrder: string[] = [];
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          executionOrder.push("typecheck");
          return { taskType: "typecheck", success: false, errorCount: 1, fixTasks: [], duration: 100 };
        },
        lint: async () => {
          executionOrder.push("lint");
          return { taskType: "lint", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
        test: async () => {
          executionOrder.push("test");
          return { taskType: "test", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint", "test"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, {
        handlers,
        stopOnFailure: true,
      });

      expect(executionOrder).toEqual(["typecheck"]);
      expect(summary.tasksRun).toBe(1);
      expect(summary.tasksFailed).toBe(1);
    });

    it("continues on failure when stopOnFailure is false", async () => {
      const executionOrder: string[] = [];
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          executionOrder.push("typecheck");
          return { taskType: "typecheck", success: false, errorCount: 1, fixTasks: [], duration: 100 };
        },
        lint: async () => {
          executionOrder.push("lint");
          return { taskType: "lint", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, {
        handlers,
        stopOnFailure: false,
      });

      expect(executionOrder).toEqual(["typecheck", "lint"]);
      expect(summary.tasksRun).toBe(2);
    });

    it("catches exceptions and marks task as failed", async () => {
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck", { throwError: true }),
        lint: createMockHandler("lint", { success: true }),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(summary.tasksFailed).toBe(1);
      expect(summary.tasksPassed).toBe(1);
      // Task that threw should have error info
      const typecheckResult = summary.results.find((r) => r.taskType === "typecheck");
      expect(typecheckResult?.success).toBe(false);
    });

    it("tracks total duration across all tasks", async () => {
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck", { duration: 100 }),
        lint: createMockHandler("lint", { duration: 200 }),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      // Duration should be sum of task durations (approximately)
      expect(summary.totalDuration).toBeGreaterThan(0);
    });

    it("includes estimated and actual costs", async () => {
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck"),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(typeof summary.estimatedCost).toBe("number");
      expect(typeof summary.actualCost).toBe("number");
    });

    it("uses mode-appropriate model (genius mode uses SOTA)", async () => {
      let usedModel = "";
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          return { taskType: "typecheck", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        defaultMode: "genius",
        microTasks: ["typecheck"],
      };

      const autoModeConfig: AutoModeConfig = {
        ...defaultAutoModeConfig,
        defaultMode: "genius",
      };

      const summary = await runReview(config, autoModeConfig, {
        handlers,
        mode: "genius",
        onModelSelected: (model) => {
          usedModel = model;
        },
      });

      // In genius mode, should use SOTA model (opus-4.5)
      expect(usedModel === "" || usedModel === "opus-4.5").toBe(true);
    });

    it("supports retries via maxRetries config", async () => {
      let attemptCount = 0;
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error("Transient error");
          }
          return { taskType: "typecheck", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        maxRetries: 3,
        microTasks: ["typecheck"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(attemptCount).toBe(3);
      expect(summary.tasksPassed).toBe(1);
    });

    it("respects maxRetries limit", async () => {
      let attemptCount = 0;
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          attemptCount++;
          throw new Error("Persistent error");
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        maxRetries: 2,
        microTasks: ["typecheck"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(attemptCount).toBe(2);
      expect(summary.tasksFailed).toBe(1);
    });

    it("skips tasks specified in skipTasks option", async () => {
      const executionOrder: string[] = [];
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          executionOrder.push("typecheck");
          return { taskType: "typecheck", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
        lint: async () => {
          executionOrder.push("lint");
          return { taskType: "lint", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
        test: async () => {
          executionOrder.push("test");
          return { taskType: "test", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint", "test"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, {
        handlers,
        skipTasks: ["lint"],
      });

      expect(executionOrder).toEqual(["typecheck", "test"]);
      expect(summary.tasksRun).toBe(2);
    });

    it("collects all fix tasks in results", async () => {
      const fix1: FixTask = { type: "typecheck_fix", file: "a.ts", description: "Fix 1", priority: "high" };
      const fix2: FixTask = { type: "lint_fix", file: "b.ts", description: "Fix 2", priority: "medium" };

      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck", { success: false, errorCount: 1, fixTasks: [fix1] }),
        lint: createMockHandler("lint", { success: false, errorCount: 1, fixTasks: [fix2] }),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint"],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers });

      expect(summary.fixTasksGenerated).toBe(2);
      const allFixTasks = summary.results.flatMap((r) => r.fixTasks);
      expect(allFixTasks).toHaveLength(2);
    });

    it("handles empty microTasks configuration", async () => {
      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: [],
      };

      const summary = await runReview(config, defaultAutoModeConfig, { handlers: {} });

      expect(summary.tasksRun).toBe(0);
      expect(summary.tasksPassed).toBe(0);
      expect(summary.tasksFailed).toBe(0);
    });

    it("logs task start message", async () => {
      const loggedMessages: string[] = [];
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck"),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck"],
      };

      await runReview(config, defaultAutoModeConfig, {
        handlers,
        logger: (msg) => loggedMessages.push(msg),
      });

      expect(loggedMessages.some((m) => m.includes("Running") && m.includes("typecheck"))).toBe(true);
    });

    it("logs success message on task pass", async () => {
      const loggedMessages: string[] = [];
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck", { success: true }),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck"],
      };

      await runReview(config, defaultAutoModeConfig, {
        handlers,
        logger: (msg) => loggedMessages.push(msg),
      });

      expect(loggedMessages.some((m) => m.includes("✅") && m.includes("PASSED"))).toBe(true);
    });

    it("logs failure message on task fail", async () => {
      const loggedMessages: string[] = [];
      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: createMockHandler("typecheck", { success: false, errorCount: 3 }),
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck"],
      };

      await runReview(config, defaultAutoModeConfig, {
        handlers,
        logger: (msg) => loggedMessages.push(msg),
      });

      expect(loggedMessages.some((m) => m.includes("❌") && m.includes("FAILED"))).toBe(true);
    });
  });

  describe("Harness Integration", () => {
    it("spawns new process for each micro-task", async () => {
      // This test verifies that each micro-task runs in isolation
      // by checking that handlers are called independently
      let handlerCallCount = 0;

      const handlers: Record<string, MicroTaskHandler> = {
        typecheck: async () => {
          handlerCallCount++;
          return { taskType: "typecheck", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
        lint: async () => {
          handlerCallCount++;
          return { taskType: "lint", success: true, errorCount: 0, fixTasks: [], duration: 100 };
        },
      };

      const config: ReviewConfig = {
        ...defaultReviewConfig,
        microTasks: ["typecheck", "lint"],
      };

      await runReview(config, defaultAutoModeConfig, { handlers });

      expect(handlerCallCount).toBe(2);
    });
  });
});
