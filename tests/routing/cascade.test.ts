/**
 * Cascade/Escalation Logic Tests
 *
 * Tests for the executeWithCascade() function that wraps task execution
 * with automatic retry/escalation logic.
 *
 * @module tests/routing/cascade
 */

import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import type { AgentAdapter, AgentResult, InvokeOptions } from "../../src/agents/types";
import type { EscalationConfig, AutoModeConfig } from "../../src/config/schema";
import type { UserStory } from "../../src/prd/parser";

// Mock types for testing
interface MockAdapter extends AgentAdapter {
  mockInvoke: (result: Partial<AgentResult>) => void;
}

// Helper to create a mock agent adapter
function createMockAdapter(
  name: string,
  defaultResult: Partial<AgentResult> = {}
): MockAdapter {
  let nextResult: Partial<AgentResult> = defaultResult;

  const adapter: MockAdapter = {
    name: name as any,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    hasSkillSupport: true,
    mockInvoke: (result: Partial<AgentResult>) => {
      nextResult = result;
    },
    async isInstalled() {
      return true;
    },
    async getExecutablePath() {
      return `/usr/bin/${name}`;
    },
    async invoke(prompt: string, options?: InvokeOptions): Promise<AgentResult> {
      return {
        output: nextResult.output ?? "Success",
        exitCode: nextResult.exitCode ?? 0,
        isComplete: nextResult.isComplete ?? true,
        duration: nextResult.duration ?? 1000,
        rateLimited: nextResult.rateLimited ?? false,
        resetTime: nextResult.resetTime,
      };
    },
    detectCompletion(output: string) {
      return output.includes("<promise>COMPLETE</promise>");
    },
    detectRateLimit(output: string) {
      const limited = output.includes("rate limit") || output.includes("429");
      return { limited, message: limited ? "Rate limited" : undefined };
    },
  };

  return adapter;
}

// Helper to create a test user story
function createTestStory(overrides: Partial<UserStory> = {}): UserStory {
  return {
    id: "US-TEST",
    title: "Test Story",
    description: "A test story for cascade testing",
    acceptanceCriteria: ["Test passes", "Implementation works"],
    priority: 1,
    passes: false,
    notes: "",
    dependencies: [],
    parallel: false,
    phase: "Stories",
    ...overrides,
  };
}

// Helper to create test escalation config
function createTestEscalationConfig(
  overrides: Partial<EscalationConfig> = {}
): EscalationConfig {
  return {
    enabled: true,
    maxAttempts: 3,
    escalationPath: {
      "haiku-4.5": "sonnet-4.5",
      "sonnet-4.5": "opus-4.5",
      "gpt-5-2-low": "gpt-5-2-medium",
      "gpt-5-2-medium": "gpt-5-2-high",
      "glm-4.6": "claude-3-5-sonnet",
      "gemini-3-flash": "gemini-3-pro",
    },
    ...overrides,
  };
}

describe("Cascade/Escalation Logic", () => {
  describe("EscalationStep interface", () => {
    it("should include attempt number, harness, model, result, and error fields", async () => {
      // Import the type to verify it exists
      const { EscalationStepSchema } = await import("../../src/routing/cascade");

      const validStep = {
        attempt: 1,
        harness: "claude",
        model: "haiku-4.5",
        result: "success",
      };

      const parsed = EscalationStepSchema.parse(validStep);
      expect(parsed.attempt).toBe(1);
      expect(parsed.harness).toBe("claude");
      expect(parsed.model).toBe("haiku-4.5");
      expect(parsed.result).toBe("success");
    });

    it("should allow optional error field", async () => {
      const { EscalationStepSchema } = await import("../../src/routing/cascade");

      const stepWithError = {
        attempt: 1,
        harness: "claude",
        model: "haiku-4.5",
        result: "failure",
        error: "Test execution failed",
      };

      const parsed = EscalationStepSchema.parse(stepWithError);
      expect(parsed.error).toBe("Test execution failed");
    });
  });

  describe("EscalationResult interface", () => {
    it("should include success, finalHarness, finalModel, attempts, and escalations fields", async () => {
      const { EscalationResultSchema } = await import("../../src/routing/cascade");

      const validResult = {
        success: true,
        finalHarness: "claude",
        finalModel: "opus-4.5",
        attempts: 2,
        escalations: [
          { attempt: 1, harness: "claude", model: "haiku-4.5", result: "failure" },
          { attempt: 2, harness: "claude", model: "sonnet-4.5", result: "success" },
        ],
        actualCost: 0.25,
      };

      const parsed = EscalationResultSchema.parse(validResult);
      expect(parsed.success).toBe(true);
      expect(parsed.finalHarness).toBe("claude");
      expect(parsed.finalModel).toBe("opus-4.5");
      expect(parsed.attempts).toBe(2);
      expect(parsed.escalations).toHaveLength(2);
      expect(parsed.actualCost).toBe(0.25);
    });
  });

  describe("executeWithCascade()", () => {
    it("should return success immediately when first execution succeeds", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      const mockAdapter = createMockAdapter("claude", {
        output: "Task completed successfully",
        exitCode: 0,
        isComplete: true,
      });

      const story = createTestStory();
      const config = createTestEscalationConfig();

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          return mockAdapter.invoke(prompt, { model });
        }
      );

      expect(result.success).toBe(true);
      expect(result.finalHarness).toBe("claude");
      expect(result.finalModel).toBe("haiku-4.5");
      expect(result.attempts).toBe(1);
      expect(result.escalations).toHaveLength(1);
      expect(result.escalations[0].result).toBe("success");
    });

    it("should escalate from haiku to sonnet on first failure", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      const story = createTestStory();
      const config = createTestEscalationConfig();

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          if (callCount === 1) {
            return {
              output: "Error: Task failed",
              exitCode: 1,
              isComplete: false,
              duration: 1000,
              rateLimited: false,
            };
          }
          return {
            output: "Task completed successfully",
            exitCode: 0,
            isComplete: true,
            duration: 1500,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.finalModel).toBe("sonnet-4.5");
      expect(result.attempts).toBe(2);
      expect(result.escalations[0].model).toBe("haiku-4.5");
      expect(result.escalations[0].result).toBe("failure");
      expect(result.escalations[1].model).toBe("sonnet-4.5");
      expect(result.escalations[1].result).toBe("success");
    });

    it("should escalate from sonnet to opus on second failure", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      const story = createTestStory();
      const config = createTestEscalationConfig();

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          if (callCount < 3) {
            return {
              output: "Error: Task failed",
              exitCode: 1,
              isComplete: false,
              duration: 1000,
              rateLimited: false,
            };
          }
          return {
            output: "Task completed successfully",
            exitCode: 0,
            isComplete: true,
            duration: 2000,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.finalModel).toBe("opus-4.5");
      expect(result.attempts).toBe(3);
      expect(result.escalations).toHaveLength(3);
    });

    it("should mark task as blocked when max attempts reached", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      const story = createTestStory();
      const config = createTestEscalationConfig({ maxAttempts: 3 });

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          return {
            output: "Error: Task failed",
            exitCode: 1,
            isComplete: false,
            duration: 1000,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.blocked).toBe(true);
      expect(result.blockReason).toContain("max attempts");
    });

    it("should return immediately when escalation is disabled", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      const story = createTestStory();
      const config = createTestEscalationConfig({ enabled: false });

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          return {
            output: "Error: Task failed",
            exitCode: 1,
            isComplete: false,
            duration: 1000,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.escalations).toHaveLength(1);
    });

    it("should track actual cost across all attempts", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      const story = createTestStory();
      const config = createTestEscalationConfig();

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          if (callCount < 2) {
            return {
              output: "Error: Task failed",
              exitCode: 1,
              isComplete: false,
              duration: 1000,
              rateLimited: false,
            };
          }
          return {
            output: "Task completed successfully",
            exitCode: 0,
            isComplete: true,
            duration: 1500,
            rateLimited: false,
          };
        }
      );

      // Cost should include all attempts, not just successful one
      expect(result.actualCost).toBeGreaterThan(0);
    });

    it("should record escalation steps with attempt number and result", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      const story = createTestStory();
      const config = createTestEscalationConfig();

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          if (callCount < 2) {
            return {
              output: "Error: Task failed",
              exitCode: 1,
              isComplete: false,
              duration: 1000,
              rateLimited: false,
            };
          }
          return {
            output: "Task completed",
            exitCode: 0,
            isComplete: true,
            duration: 1500,
            rateLimited: false,
          };
        }
      );

      expect(result.escalations[0].attempt).toBe(1);
      expect(result.escalations[0].harness).toBe("claude");
      expect(result.escalations[0].model).toBe("haiku-4.5");
      expect(result.escalations[0].result).toBe("failure");

      expect(result.escalations[1].attempt).toBe(2);
      expect(result.escalations[1].harness).toBe("claude");
      expect(result.escalations[1].model).toBe("sonnet-4.5");
      expect(result.escalations[1].result).toBe("success");
    });

    it("should include error message in escalation step on failure", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      const story = createTestStory();
      const config = createTestEscalationConfig();

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          if (callCount < 2) {
            return {
              output: "Error: TypeScript compilation failed",
              exitCode: 1,
              isComplete: false,
              duration: 1000,
              rateLimited: false,
            };
          }
          return {
            output: "Task completed",
            exitCode: 0,
            isComplete: true,
            duration: 1500,
            rateLimited: false,
          };
        }
      );

      expect(result.escalations[0].error).toContain("TypeScript compilation failed");
    });
  });

  describe("getNextModel()", () => {
    it("should return next model from escalation path", async () => {
      const { getNextModel } = await import("../../src/routing/cascade");

      const escalationPath = {
        "haiku-4.5": "sonnet-4.5",
        "sonnet-4.5": "opus-4.5",
      };

      expect(getNextModel("haiku-4.5", escalationPath)).toBe("sonnet-4.5");
      expect(getNextModel("sonnet-4.5", escalationPath)).toBe("opus-4.5");
    });

    it("should return undefined when no next model exists", async () => {
      const { getNextModel } = await import("../../src/routing/cascade");

      const escalationPath = {
        "haiku-4.5": "sonnet-4.5",
      };

      expect(getNextModel("opus-4.5", escalationPath)).toBeUndefined();
    });
  });

  describe("Free mode escalation", () => {
    it("should escalate from free mode to cheap mode models when free options exhausted", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      const story = createTestStory();
      const config = createTestEscalationConfig({
        escalationPath: {
          "glm-4.7": "haiku-4.5", // Free to cheap
          "haiku-4.5": "sonnet-4.5",
        },
      });

      const result = await executeWithCascade(
        story,
        "opencode",
        "glm-4.7",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          if (callCount < 2) {
            return {
              output: "Error: Task too complex for free model",
              exitCode: 1,
              isComplete: false,
              duration: 1000,
              rateLimited: false,
            };
          }
          return {
            output: "Task completed",
            exitCode: 0,
            isComplete: true,
            duration: 1500,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.escalations[0].model).toBe("glm-4.7");
      expect(result.escalations[1].model).toBe("haiku-4.5");
    });
  });

  describe("Rate limit handling", () => {
    it("should record rate_limited result in escalation step", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      const story = createTestStory();
      const config = createTestEscalationConfig();

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          if (callCount === 1) {
            return {
              output: "Error: rate limit exceeded",
              exitCode: 1,
              isComplete: false,
              duration: 500,
              rateLimited: true,
              resetTime: new Date(Date.now() + 60000),
            };
          }
          return {
            output: "Task completed",
            exitCode: 0,
            isComplete: true,
            duration: 1500,
            rateLimited: false,
          };
        }
      );

      expect(result.escalations[0].result).toBe("rate_limited");
    });
  });

  describe("Harness change during escalation", () => {
    it("should allow harness change when model escalation path changes harness", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      let callCount = 0;
      let lastHarness = "";
      const story = createTestStory();
      const config = createTestEscalationConfig({
        escalationPath: {
          "glm-4.6": "claude-3-5-sonnet", // Droid model to Claude model (cross-harness)
        },
      });

      const result = await executeWithCascade(
        story,
        "droid",
        "glm-4.6",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          callCount++;
          lastHarness = harness;
          if (callCount < 2) {
            return {
              output: "Error: Task failed",
              exitCode: 1,
              isComplete: false,
              duration: 1000,
              rateLimited: false,
            };
          }
          return {
            output: "Task completed",
            exitCode: 0,
            isComplete: true,
            duration: 1500,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(true);
      expect(result.escalations[0].harness).toBe("droid");
      expect(result.escalations[0].model).toBe("glm-4.6");
      // The second escalation should use the harness for claude-3-5-sonnet
      expect(result.escalations[1].model).toBe("claude-3-5-sonnet");
    });
  });

  describe("Configuration edge cases", () => {
    it("should handle maxAttempts of 1 (no escalation)", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      const story = createTestStory();
      const config = createTestEscalationConfig({ maxAttempts: 1 });

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          return {
            output: "Error: Task failed",
            exitCode: 1,
            isComplete: false,
            duration: 1000,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.blocked).toBe(true);
    });

    it("should handle empty escalation path", async () => {
      const { executeWithCascade } = await import("../../src/routing/cascade");

      const story = createTestStory();
      const config = createTestEscalationConfig({ escalationPath: {} });

      const result = await executeWithCascade(
        story,
        "claude",
        "haiku-4.5",
        "Execute the task",
        config,
        async (harness, model, prompt) => {
          return {
            output: "Error: Task failed",
            exitCode: 1,
            isComplete: false,
            duration: 1000,
            rateLimited: false,
          };
        }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.blocked).toBe(true);
      expect(result.blockReason).toContain("no escalation path");
    });
  });
});
