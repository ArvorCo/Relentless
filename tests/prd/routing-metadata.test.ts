/**
 * Tests for PRD.json Schema Extension for Routing Metadata (US-026)
 *
 * TDD - Red phase: These tests define the expected behavior for routing
 * and execution metadata in user stories.
 */

import { describe, it, expect } from "bun:test";
import {
  RoutingMetadataSchema,
  ExecutionHistorySchema,
  EscalationAttemptSchema,
  UserStorySchema,
  PRDSchema,
  type RoutingMetadata,
  type ExecutionHistory,
  type EscalationAttempt,
  type UserStory,
} from "../../src/prd/types";

describe("US-026: PRD.json Schema Extension for Routing Metadata", () => {
  describe("RoutingMetadataSchema", () => {
    it("should validate a complete routing metadata object", () => {
      const validRouting: RoutingMetadata = {
        complexity: "medium",
        harness: "claude",
        model: "sonnet-4.5",
        mode: "good",
        estimatedCost: 0.15,
        classificationReasoning: "Keywords: implement, add feature suggest medium complexity",
      };

      const result = RoutingMetadataSchema.safeParse(validRouting);
      expect(result.success).toBe(true);
    });

    it("should validate routing metadata with minimal required fields", () => {
      const minimalRouting = {
        complexity: "simple",
        harness: "opencode",
        model: "glm-4.7",
        mode: "free",
        estimatedCost: 0,
      };

      const result = RoutingMetadataSchema.safeParse(minimalRouting);
      expect(result.success).toBe(true);
    });

    it("should allow classificationReasoning to be optional", () => {
      const routingWithoutReasoning = {
        complexity: "complex",
        harness: "codex",
        model: "gpt-5.2-high",
        mode: "good",
        estimatedCost: 0.45,
      };

      const result = RoutingMetadataSchema.safeParse(routingWithoutReasoning);
      expect(result.success).toBe(true);
    });

    it("should reject invalid complexity values", () => {
      const invalidRouting = {
        complexity: "very-hard", // invalid
        harness: "claude",
        model: "opus-4.5",
        mode: "genius",
        estimatedCost: 1.50,
      };

      const result = RoutingMetadataSchema.safeParse(invalidRouting);
      expect(result.success).toBe(false);
    });

    it("should reject invalid harness values", () => {
      const invalidRouting = {
        complexity: "medium",
        harness: "unknown-harness", // invalid
        model: "some-model",
        mode: "good",
        estimatedCost: 0.20,
      };

      const result = RoutingMetadataSchema.safeParse(invalidRouting);
      expect(result.success).toBe(false);
    });

    it("should reject invalid mode values", () => {
      const invalidRouting = {
        complexity: "simple",
        harness: "claude",
        model: "haiku-4.5",
        mode: "ultra", // invalid
        estimatedCost: 0.02,
      };

      const result = RoutingMetadataSchema.safeParse(invalidRouting);
      expect(result.success).toBe(false);
    });

    it("should reject negative estimated cost", () => {
      const invalidRouting = {
        complexity: "medium",
        harness: "claude",
        model: "sonnet-4.5",
        mode: "good",
        estimatedCost: -0.10, // invalid
      };

      const result = RoutingMetadataSchema.safeParse(invalidRouting);
      expect(result.success).toBe(false);
    });

    it("should validate all valid complexity levels", () => {
      const complexities = ["simple", "medium", "complex", "expert"];
      for (const complexity of complexities) {
        const routing = {
          complexity,
          harness: "claude",
          model: "sonnet-4.5",
          mode: "good",
          estimatedCost: 0.15,
        };
        const result = RoutingMetadataSchema.safeParse(routing);
        expect(result.success).toBe(true);
      }
    });

    it("should validate all valid harness names", () => {
      const harnesses = ["claude", "codex", "droid", "opencode", "amp", "gemini"];
      for (const harness of harnesses) {
        const routing = {
          complexity: "medium",
          harness,
          model: "test-model",
          mode: "good",
          estimatedCost: 0.10,
        };
        const result = RoutingMetadataSchema.safeParse(routing);
        expect(result.success).toBe(true);
      }
    });

    it("should validate all valid mode values", () => {
      const modes = ["free", "cheap", "good", "genius"];
      for (const mode of modes) {
        const routing = {
          complexity: "medium",
          harness: "claude",
          model: "sonnet-4.5",
          mode,
          estimatedCost: 0.15,
        };
        const result = RoutingMetadataSchema.safeParse(routing);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("EscalationAttemptSchema", () => {
    it("should validate a complete escalation attempt", () => {
      const attempt: EscalationAttempt = {
        attempt: 1,
        harness: "claude",
        model: "haiku-4.5",
        result: "failure",
        error: "Task too complex for model capabilities",
        cost: 0.02,
        duration: 45000,
      };

      const result = EscalationAttemptSchema.safeParse(attempt);
      expect(result.success).toBe(true);
    });

    it("should validate a successful attempt without error", () => {
      const attempt = {
        attempt: 2,
        harness: "claude",
        model: "sonnet-4.5",
        result: "success",
        cost: 0.15,
        duration: 120000,
      };

      const result = EscalationAttemptSchema.safeParse(attempt);
      expect(result.success).toBe(true);
    });

    it("should validate a rate-limited attempt", () => {
      const attempt = {
        attempt: 1,
        harness: "codex",
        model: "gpt-5.2-high",
        result: "rate_limited",
        error: "429: Too many requests",
        cost: 0.01,
        duration: 5000,
      };

      const result = EscalationAttemptSchema.safeParse(attempt);
      expect(result.success).toBe(true);
    });

    it("should reject invalid result values", () => {
      const invalidAttempt = {
        attempt: 1,
        harness: "claude",
        model: "opus-4.5",
        result: "maybe", // invalid
        cost: 0.50,
        duration: 60000,
      };

      const result = EscalationAttemptSchema.safeParse(invalidAttempt);
      expect(result.success).toBe(false);
    });

    it("should reject attempt number less than 1", () => {
      const invalidAttempt = {
        attempt: 0, // invalid
        harness: "claude",
        model: "sonnet-4.5",
        result: "success",
        cost: 0.15,
        duration: 100000,
      };

      const result = EscalationAttemptSchema.safeParse(invalidAttempt);
      expect(result.success).toBe(false);
    });

    it("should reject negative cost", () => {
      const invalidAttempt = {
        attempt: 1,
        harness: "claude",
        model: "haiku-4.5",
        result: "success",
        cost: -0.05, // invalid
        duration: 30000,
      };

      const result = EscalationAttemptSchema.safeParse(invalidAttempt);
      expect(result.success).toBe(false);
    });

    it("should reject negative duration", () => {
      const invalidAttempt = {
        attempt: 1,
        harness: "claude",
        model: "haiku-4.5",
        result: "success",
        cost: 0.02,
        duration: -1000, // invalid
      };

      const result = EscalationAttemptSchema.safeParse(invalidAttempt);
      expect(result.success).toBe(false);
    });
  });

  describe("ExecutionHistorySchema", () => {
    it("should validate a complete execution history", () => {
      const history: ExecutionHistory = {
        attempts: 2,
        escalations: [
          {
            attempt: 1,
            harness: "claude",
            model: "haiku-4.5",
            result: "failure",
            error: "Quality check failed",
            cost: 0.02,
            duration: 30000,
          },
          {
            attempt: 2,
            harness: "claude",
            model: "sonnet-4.5",
            result: "success",
            cost: 0.15,
            duration: 90000,
          },
        ],
        actualCost: 0.17,
        actualHarness: "claude",
        actualModel: "sonnet-4.5",
        inputTokens: 5000,
        outputTokens: 3000,
      };

      const result = ExecutionHistorySchema.safeParse(history);
      expect(result.success).toBe(true);
    });

    it("should validate execution history with single successful attempt", () => {
      const history = {
        attempts: 1,
        escalations: [
          {
            attempt: 1,
            harness: "opencode",
            model: "glm-4.7",
            result: "success",
            cost: 0,
            duration: 60000,
          },
        ],
        actualCost: 0,
        actualHarness: "opencode",
        actualModel: "glm-4.7",
      };

      const result = ExecutionHistorySchema.safeParse(history);
      expect(result.success).toBe(true);
    });

    it("should allow optional token counts", () => {
      const history = {
        attempts: 1,
        escalations: [
          {
            attempt: 1,
            harness: "claude",
            model: "sonnet-4.5",
            result: "success",
            cost: 0.15,
            duration: 100000,
          },
        ],
        actualCost: 0.15,
        actualHarness: "claude",
        actualModel: "sonnet-4.5",
        // inputTokens and outputTokens omitted
      };

      const result = ExecutionHistorySchema.safeParse(history);
      expect(result.success).toBe(true);
    });

    it("should reject attempts less than 1", () => {
      const invalidHistory = {
        attempts: 0, // invalid
        escalations: [],
        actualCost: 0,
        actualHarness: "claude",
        actualModel: "sonnet-4.5",
      };

      const result = ExecutionHistorySchema.safeParse(invalidHistory);
      expect(result.success).toBe(false);
    });

    it("should reject negative actual cost", () => {
      const invalidHistory = {
        attempts: 1,
        escalations: [
          {
            attempt: 1,
            harness: "claude",
            model: "sonnet-4.5",
            result: "success",
            cost: 0.15,
            duration: 100000,
          },
        ],
        actualCost: -0.15, // invalid
        actualHarness: "claude",
        actualModel: "sonnet-4.5",
      };

      const result = ExecutionHistorySchema.safeParse(invalidHistory);
      expect(result.success).toBe(false);
    });

    it("should reject negative input tokens", () => {
      const invalidHistory = {
        attempts: 1,
        escalations: [
          {
            attempt: 1,
            harness: "claude",
            model: "sonnet-4.5",
            result: "success",
            cost: 0.15,
            duration: 100000,
          },
        ],
        actualCost: 0.15,
        actualHarness: "claude",
        actualModel: "sonnet-4.5",
        inputTokens: -1000, // invalid
      };

      const result = ExecutionHistorySchema.safeParse(invalidHistory);
      expect(result.success).toBe(false);
    });
  });

  describe("Extended UserStorySchema with routing and execution", () => {
    it("should accept a user story without routing metadata (backward compatible)", () => {
      const story = {
        id: "US-001",
        title: "Test Story",
        description: "A test story",
        acceptanceCriteria: ["Criterion 1", "Criterion 2"],
        priority: 1,
        passes: false,
        notes: "",
      };

      const result = UserStorySchema.safeParse(story);
      expect(result.success).toBe(true);
    });

    it("should accept a user story with routing metadata", () => {
      const story: UserStory = {
        id: "US-002",
        title: "Add Feature X",
        description: "Implement feature X with tests",
        acceptanceCriteria: ["AC1", "AC2", "AC3"],
        priority: 2,
        passes: false,
        notes: "",
        routing: {
          complexity: "medium",
          harness: "claude",
          model: "sonnet-4.5",
          mode: "good",
          estimatedCost: 0.15,
          classificationReasoning: "Keywords suggest medium complexity",
        },
      };

      const result = UserStorySchema.safeParse(story);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routing).toBeDefined();
        expect(result.data.routing?.complexity).toBe("medium");
      }
    });

    it("should accept a user story with execution history", () => {
      const story: UserStory = {
        id: "US-003",
        title: "Fix Bug Y",
        description: "Fix the bug in module Y",
        acceptanceCriteria: ["Bug is fixed", "Tests pass"],
        priority: 1,
        passes: true,
        notes: "Completed after escalation",
        execution: {
          attempts: 2,
          escalations: [
            {
              attempt: 1,
              harness: "claude",
              model: "haiku-4.5",
              result: "failure",
              error: "Complexity underestimated",
              cost: 0.02,
              duration: 30000,
            },
            {
              attempt: 2,
              harness: "claude",
              model: "sonnet-4.5",
              result: "success",
              cost: 0.15,
              duration: 90000,
            },
          ],
          actualCost: 0.17,
          actualHarness: "claude",
          actualModel: "sonnet-4.5",
          inputTokens: 5000,
          outputTokens: 3000,
        },
      };

      const result = UserStorySchema.safeParse(story);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.execution).toBeDefined();
        expect(result.data.execution?.attempts).toBe(2);
        expect(result.data.execution?.actualModel).toBe("sonnet-4.5");
      }
    });

    it("should accept a user story with both routing and execution", () => {
      const story: UserStory = {
        id: "US-004",
        title: "Implement API Endpoint",
        description: "Create REST API endpoint",
        acceptanceCriteria: ["Endpoint works", "Tests pass", "Docs updated"],
        priority: 3,
        passes: true,
        notes: "Completed on first attempt",
        routing: {
          complexity: "medium",
          harness: "claude",
          model: "sonnet-4.5",
          mode: "good",
          estimatedCost: 0.15,
        },
        execution: {
          attempts: 1,
          escalations: [
            {
              attempt: 1,
              harness: "claude",
              model: "sonnet-4.5",
              result: "success",
              cost: 0.14,
              duration: 85000,
            },
          ],
          actualCost: 0.14,
          actualHarness: "claude",
          actualModel: "sonnet-4.5",
        },
      };

      const result = UserStorySchema.safeParse(story);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routing).toBeDefined();
        expect(result.data.execution).toBeDefined();
      }
    });
  });

  describe("PRDSchema with extended stories", () => {
    it("should validate a PRD with mixed stories (some with routing, some without)", () => {
      const prd = {
        project: "Test Project",
        branchName: "feature/test",
        description: "A test PRD",
        userStories: [
          {
            id: "US-001",
            title: "Story 1",
            description: "First story",
            acceptanceCriteria: ["AC1"],
            priority: 1,
            passes: false,
            notes: "",
            // No routing - should still be valid (backward compatible)
          },
          {
            id: "US-002",
            title: "Story 2",
            description: "Second story",
            acceptanceCriteria: ["AC2"],
            priority: 2,
            passes: true,
            notes: "Done",
            routing: {
              complexity: "simple",
              harness: "opencode",
              model: "glm-4.7",
              mode: "free",
              estimatedCost: 0,
            },
            execution: {
              attempts: 1,
              escalations: [
                {
                  attempt: 1,
                  harness: "opencode",
                  model: "glm-4.7",
                  result: "success",
                  cost: 0,
                  duration: 45000,
                },
              ],
              actualCost: 0,
              actualHarness: "opencode",
              actualModel: "glm-4.7",
            },
          },
        ],
      };

      const result = PRDSchema.safeParse(prd);
      expect(result.success).toBe(true);
    });

    it("should accept routingPreference at the PRD level", () => {
      const prd = {
        project: "Routing Pref Test",
        branchName: "feature/routing-pref",
        description: "Test routing preference",
        routingPreference: {
          type: "auto",
          mode: "cheap",
          allowFree: false,
        },
        userStories: [
          {
            id: "US-001",
            title: "Story 1",
            description: "First story",
            acceptanceCriteria: ["AC1"],
            priority: 1,
            passes: false,
            notes: "",
          },
        ],
      };

      const result = PRDSchema.safeParse(prd);
      expect(result.success).toBe(true);
    });

    it("should preserve routing metadata when parsing and re-serializing", () => {
      const prd = {
        project: "Routing Test",
        branchName: "feature/routing",
        description: "Test routing metadata preservation",
        userStories: [
          {
            id: "US-001",
            title: "Test",
            description: "Test story",
            acceptanceCriteria: ["AC1"],
            priority: 1,
            passes: false,
            notes: "",
            routing: {
              complexity: "complex",
              harness: "codex",
              model: "gpt-5.2-high",
              mode: "good",
              estimatedCost: 0.45,
              classificationReasoning: "Security-related task",
            },
          },
        ],
      };

      const parseResult = PRDSchema.safeParse(prd);
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        const serialized = JSON.stringify(parseResult.data);
        const reparsed = PRDSchema.safeParse(JSON.parse(serialized));
        expect(reparsed.success).toBe(true);
        if (reparsed.success) {
          expect(reparsed.data.userStories[0].routing?.classificationReasoning).toBe(
            "Security-related task"
          );
        }
      }
    });
  });

  describe("Type exports", () => {
    it("should export RoutingMetadata type", () => {
      const routing: RoutingMetadata = {
        complexity: "medium",
        harness: "claude",
        model: "sonnet-4.5",
        mode: "good",
        estimatedCost: 0.15,
      };
      expect(routing.complexity).toBe("medium");
    });

    it("should export ExecutionHistory type", () => {
      const execution: ExecutionHistory = {
        attempts: 1,
        escalations: [],
        actualCost: 0,
        actualHarness: "opencode",
        actualModel: "glm-4.7",
      };
      expect(execution.attempts).toBe(1);
    });

    it("should export EscalationAttempt type", () => {
      const attempt: EscalationAttempt = {
        attempt: 1,
        harness: "claude",
        model: "sonnet-4.5",
        result: "success",
        cost: 0.15,
        duration: 100000,
      };
      expect(attempt.result).toBe("success");
    });
  });
});
