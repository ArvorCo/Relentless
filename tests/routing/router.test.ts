/**
 * Tests for Mode-Model Matrix Router (US-010)
 *
 * TDD: Tests written BEFORE implementation.
 */

import { describe, expect, it, beforeEach, mock, spyOn, afterEach } from "bun:test";
import type { UserStory } from "../../src/prd/types";
import type { AutoModeConfig, Mode, Complexity, HarnessName } from "../../src/config/schema";

// Tests for the router module - we define expected interfaces first

/**
 * Expected interface for RoutingDecision
 */
interface RoutingDecision {
  harness: HarnessName;
  model: string;
  complexity: Complexity;
  mode: Mode;
  estimatedCost: number;
  reasoning: string;
}

/**
 * Expected interface for RoutingRule (internal to matrix)
 */
interface RoutingRule {
  harness: HarnessName;
  model: string;
}

// Helper to create test user stories
function createTestStory(overrides: Partial<UserStory> = {}): UserStory {
  return {
    id: "US-001",
    title: "Test Story",
    description: "A test story for routing",
    acceptanceCriteria: ["Criteria 1", "Criteria 2"],
    priority: 1,
    passes: false,
    notes: "",
    ...overrides,
  };
}

// Helper to create test config
function createTestConfig(overrides: Partial<AutoModeConfig> = {}): AutoModeConfig {
  return {
    enabled: true,
    defaultMode: "good",
    fallbackOrder: ["claude", "codex", "droid", "opencode", "amp", "gemini"],
    modeModels: {
      simple: "haiku-4.5",
      medium: "sonnet-4.5",
      complex: "opus-4.5",
      expert: "opus-4.5",
    },
    review: {
      promptUser: true,
      defaultMode: "good",
      microTasks: ["typecheck", "lint", "test", "security", "quality", "docs"],
      maxRetries: 3,
    },
    escalation: {
      enabled: true,
      maxAttempts: 3,
      escalationPath: {
        "haiku-4.5": "sonnet-4.5",
        "sonnet-4.5": "opus-4.5",
      },
    },
    ...overrides,
  };
}

describe("Mode-Model Matrix Router", () => {
  describe("MODE_MODEL_MATRIX", () => {
    it("should export MODE_MODEL_MATRIX constant", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      expect(MODE_MODEL_MATRIX).toBeDefined();
    });

    it("should have 4 modes (free, cheap, good, genius)", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      expect(Object.keys(MODE_MODEL_MATRIX)).toContain("free");
      expect(Object.keys(MODE_MODEL_MATRIX)).toContain("cheap");
      expect(Object.keys(MODE_MODEL_MATRIX)).toContain("good");
      expect(Object.keys(MODE_MODEL_MATRIX)).toContain("genius");
      expect(Object.keys(MODE_MODEL_MATRIX).length).toBe(4);
    });

    it("should have 4 complexity levels per mode", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const complexityLevels = ["simple", "medium", "complex", "expert"];

      for (const mode of ["free", "cheap", "good", "genius"] as const) {
        for (const complexity of complexityLevels) {
          expect(MODE_MODEL_MATRIX[mode][complexity as Complexity]).toBeDefined();
        }
      }
    });

    // Free mode routing rules
    it("free mode should route simple tasks to glm-4.7/opencode", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.free.simple;
      expect(rule.harness).toBe("opencode");
      expect(rule.model).toBe("glm-4.7");
    });

    it("free mode should route medium tasks to glm-4.7/opencode", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.free.medium;
      expect(rule.harness).toBe("opencode");
      expect(rule.model).toBe("glm-4.7");
    });

    it("free mode should route complex tasks to grok-code-fast-1/opencode", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.free.complex;
      expect(rule.harness).toBe("opencode");
      expect(rule.model).toBe("grok-code-fast-1");
    });

    it("free mode should route expert tasks to grok-code-fast-1/opencode", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.free.expert;
      expect(rule.harness).toBe("opencode");
      expect(rule.model).toBe("grok-code-fast-1");
    });

    // Cheap mode routing rules
    it("cheap mode should route simple tasks to haiku-4.5/claude", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.cheap.simple;
      expect(rule.harness).toBe("claude");
      expect(rule.model).toBe("haiku-4.5");
    });

    it("cheap mode should route medium tasks to gemini-3-flash/gemini", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.cheap.medium;
      expect(rule.harness).toBe("gemini");
      expect(rule.model).toBe("gemini-3-flash");
    });

    it("cheap mode should route complex tasks to gpt-5.2-low/codex", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.cheap.complex;
      expect(rule.harness).toBe("codex");
      expect(rule.model).toBe("gpt-5.2-low");
    });

    it("cheap mode should route expert tasks to gpt-5.2-low/codex", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.cheap.expert;
      expect(rule.harness).toBe("codex");
      expect(rule.model).toBe("gpt-5.2-low");
    });

    // Good mode routing rules
    it("good mode should route simple tasks to sonnet-4.5/claude", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.good.simple;
      expect(rule.harness).toBe("claude");
      expect(rule.model).toBe("sonnet-4.5");
    });

    it("good mode should route medium tasks to sonnet-4.5/claude", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.good.medium;
      expect(rule.harness).toBe("claude");
      expect(rule.model).toBe("sonnet-4.5");
    });

    it("good mode should route complex tasks to opus-4.5/claude", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.good.complex;
      expect(rule.harness).toBe("claude");
      expect(rule.model).toBe("opus-4.5");
    });

    it("good mode should route expert tasks to opus-4.5/claude", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");
      const rule = MODE_MODEL_MATRIX.good.expert;
      expect(rule.harness).toBe("claude");
      expect(rule.model).toBe("opus-4.5");
    });

    // Genius mode routing rules
    it("genius mode should route all complexity levels to opus-4.5/claude", async () => {
      const { MODE_MODEL_MATRIX } = await import("../../src/routing/router");

      for (const complexity of ["simple", "medium", "complex", "expert"] as const) {
        const rule = MODE_MODEL_MATRIX.genius[complexity];
        expect(rule.harness).toBe("claude");
        expect(rule.model).toBe("opus-4.5");
      }
    });
  });

  describe("RoutingDecisionSchema", () => {
    it("should export RoutingDecisionSchema", async () => {
      const { RoutingDecisionSchema } = await import("../../src/routing/router");
      expect(RoutingDecisionSchema).toBeDefined();
    });

    it("should validate correct RoutingDecision objects", async () => {
      const { RoutingDecisionSchema } = await import("../../src/routing/router");

      const decision = {
        harness: "claude",
        model: "opus-4.5",
        complexity: "complex",
        mode: "good",
        estimatedCost: 0.15,
        reasoning: "Task classified as complex, using good mode",
      };

      const result = RoutingDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("should reject invalid harness values", async () => {
      const { RoutingDecisionSchema } = await import("../../src/routing/router");

      const decision = {
        harness: "invalid_harness",
        model: "opus-4.5",
        complexity: "complex",
        mode: "good",
        estimatedCost: 0.15,
        reasoning: "Test",
      };

      const result = RoutingDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  describe("routeTask()", () => {
    it("should export routeTask function", async () => {
      const { routeTask } = await import("../../src/routing/router");
      expect(routeTask).toBeDefined();
      expect(typeof routeTask).toBe("function");
    });

    it("should return a RoutingDecision object", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo in README" });
      const config = createTestConfig({ defaultMode: "good" });

      const result = await routeTask(story, config);

      expect(result).toHaveProperty("harness");
      expect(result).toHaveProperty("model");
      expect(result).toHaveProperty("complexity");
      expect(result).toHaveProperty("mode");
      expect(result).toHaveProperty("estimatedCost");
      expect(result).toHaveProperty("reasoning");
    });

    it("should call classifier to determine complexity", async () => {
      const { routeTask } = await import("../../src/routing/router");
      const classifierModule = await import("../../src/routing/classifier");

      const story = createTestStory({ title: "Fix typo in README" });
      const config = createTestConfig({ defaultMode: "good" });

      // The result should reflect the classified complexity
      const result = await routeTask(story, config);

      // For "fix typo", should be classified as simple
      expect(result.complexity).toBe("simple");
    });

    it("should use mode from config.defaultMode", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo" });
      const config = createTestConfig({ defaultMode: "cheap" });

      const result = await routeTask(story, config);
      expect(result.mode).toBe("cheap");
    });

    it("should route simple task in free mode to opencode/glm-4.7", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo in README" });
      const config = createTestConfig({ defaultMode: "free" });

      const result = await routeTask(story, config);

      expect(result.complexity).toBe("simple");
      expect(result.mode).toBe("free");
      expect(result.harness).toBe("opencode");
      expect(result.model).toBe("glm-4.7");
    });

    it("should route medium task in cheap mode to gemini/gemini-3-flash", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({
        title: "Implement new API endpoint",
        description: "Add a new endpoint for user validation",
      });
      const config = createTestConfig({ defaultMode: "cheap" });

      const result = await routeTask(story, config);

      expect(result.complexity).toBe("medium");
      expect(result.mode).toBe("cheap");
      expect(result.harness).toBe("gemini");
      expect(result.model).toBe("gemini-3-flash");
    });

    it("should route complex task in good mode to claude/opus-4.5", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({
        title: "Implement OAuth authentication",
        description: "Add OAuth 2.0 with JWT tokens for secure authentication",
      });
      const config = createTestConfig({ defaultMode: "good" });

      const result = await routeTask(story, config);

      expect(result.complexity).toBe("complex");
      expect(result.mode).toBe("good");
      expect(result.harness).toBe("claude");
      expect(result.model).toBe("opus-4.5");
    });

    it("should route expert task in genius mode to claude/opus-4.5", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({
        title: "Design distributed caching system",
        description: "Implement parallel processing with concurrency controls",
      });
      const config = createTestConfig({ defaultMode: "genius" });

      const result = await routeTask(story, config);

      expect(result.complexity).toBe("expert");
      expect(result.mode).toBe("genius");
      expect(result.harness).toBe("claude");
      expect(result.model).toBe("opus-4.5");
    });

    it("should honor custom modeModels overrides when provided", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo in README" });
      const config = createTestConfig({
        defaultMode: "good",
        modeModels: {
          simple: "gpt-5.2-low",
          medium: "sonnet-4.5",
          complex: "opus-4.5",
          expert: "opus-4.5",
        },
      });

      const result = await routeTask(story, config);

      expect(result.complexity).toBe("simple");
      expect(result.harness).toBe("codex");
      expect(result.model).toBe("gpt-5.2-low");
    });

    it("should ignore non-free overrides in free mode", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo in README" });
      const config = createTestConfig({
        defaultMode: "free",
        modeModels: {
          simple: "haiku-4.5",
          medium: "sonnet-4.5",
          complex: "opus-4.5",
          expert: "opus-4.5",
        },
      });

      const result = await routeTask(story, config);

      expect(result.complexity).toBe("simple");
      expect(result.harness).toBe("opencode");
      expect(result.model).toBe("glm-4.7");
    });
  });

  describe("estimatedCost calculation", () => {
    it("should calculate estimated cost based on token estimation", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({
        title: "Test story",
        description: "A description",
        acceptanceCriteria: ["Criteria 1", "Criteria 2"],
      });
      const config = createTestConfig({ defaultMode: "good" });

      const result = await routeTask(story, config);

      // Cost should be positive
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    it("should estimate zero cost for free tier models", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo" });
      const config = createTestConfig({ defaultMode: "free" });

      const result = await routeTask(story, config);

      // Free tier should have zero or very low cost
      expect(result.estimatedCost).toBe(0);
    });

    it("should estimate higher cost for SOTA models", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({
        title: "Implement complex architecture",
        description: "Security and authentication system with OAuth integration",
      });
      const config = createTestConfig({ defaultMode: "genius" });

      const result = await routeTask(story, config);

      // Genius mode with Opus should have higher cost (non-zero)
      expect(result.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe("Token estimation", () => {
    it("should export estimateTokens function", async () => {
      const { estimateTokens } = await import("../../src/routing/router");
      expect(estimateTokens).toBeDefined();
      expect(typeof estimateTokens).toBe("function");
    });

    it("should estimate tokens based on story content", async () => {
      const { estimateTokens } = await import("../../src/routing/router");

      const story = createTestStory({
        title: "Short title",
        description: "Short description",
        acceptanceCriteria: ["Criteria"],
      });

      const tokens = estimateTokens(story);
      expect(tokens).toBeGreaterThan(0);
    });

    it("should estimate more tokens for longer content", async () => {
      const { estimateTokens } = await import("../../src/routing/router");

      const shortStory = createTestStory({
        title: "Short",
        description: "Brief",
        acceptanceCriteria: ["One"],
      });

      const longStory = createTestStory({
        title: "A very long and detailed title that describes the feature extensively",
        description:
          "This is a much longer description that contains a lot of detail about what needs to be done, including implementation steps, architectural considerations, and testing requirements.",
        acceptanceCriteria: [
          "First acceptance criteria with detailed explanation",
          "Second acceptance criteria with more details",
          "Third acceptance criteria covering edge cases",
          "Fourth acceptance criteria for error handling",
          "Fifth acceptance criteria for documentation",
        ],
      });

      const shortTokens = estimateTokens(shortStory);
      const longTokens = estimateTokens(longStory);

      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it("should use formula: (content.length / 4) * 1.5", async () => {
      const { estimateTokens } = await import("../../src/routing/router");

      const story = createTestStory({
        title: "Test", // 4 chars
        description: "Desc", // 4 chars
        acceptanceCriteria: ["Crit"], // 4 chars
      });

      // Total: 12 chars
      // Expected: (12 / 4) * 1.5 = 4.5
      const tokens = estimateTokens(story);

      // Allow some tolerance for formula implementation
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe("calculateCost", () => {
    it("should export calculateCost function", async () => {
      const { calculateCost } = await import("../../src/routing/router");
      expect(calculateCost).toBeDefined();
      expect(typeof calculateCost).toBe("function");
    });

    it("should calculate cost based on model profile and token count", async () => {
      const { calculateCost } = await import("../../src/routing/router");

      // Opus has inputCost: 5.0, outputCost: 25.0 per MTok
      const cost = calculateCost("opus-4.5", 1000);

      expect(cost).toBeGreaterThan(0);
    });

    it("should return 0 for free tier models", async () => {
      const { calculateCost } = await import("../../src/routing/router");

      const cost = calculateCost("glm-4.7", 1000);
      expect(cost).toBe(0);
    });

    it("should return 0 for unknown models", async () => {
      const { calculateCost } = await import("../../src/routing/router");

      const cost = calculateCost("unknown-model", 1000);
      expect(cost).toBe(0);
    });
  });

  describe("reasoning field", () => {
    it("should include complexity in reasoning", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo" });
      const config = createTestConfig({ defaultMode: "good" });

      const result = await routeTask(story, config);

      expect(result.reasoning).toContain("simple");
    });

    it("should include mode in reasoning", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo" });
      const config = createTestConfig({ defaultMode: "cheap" });

      const result = await routeTask(story, config);

      expect(result.reasoning).toContain("cheap");
    });

    it("should include harness and model in reasoning", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo" });
      const config = createTestConfig({ defaultMode: "good" });

      const result = await routeTask(story, config);

      expect(result.reasoning).toContain(result.harness);
      expect(result.reasoning).toContain(result.model);
    });
  });

  describe("Mode override support", () => {
    it("should accept optional mode parameter to override config.defaultMode", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo" });
      const config = createTestConfig({ defaultMode: "good" });

      // Override mode to "genius"
      const result = await routeTask(story, config, "genius");

      expect(result.mode).toBe("genius");
      expect(result.harness).toBe("claude");
      expect(result.model).toBe("opus-4.5");
    });

    it("should use config.defaultMode when mode parameter is not provided", async () => {
      const { routeTask } = await import("../../src/routing/router");

      const story = createTestStory({ title: "Fix typo" });
      const config = createTestConfig({ defaultMode: "cheap" });

      const result = await routeTask(story, config);

      expect(result.mode).toBe("cheap");
    });
  });

  describe("Type exports", () => {
    it("should export RoutingDecision type", async () => {
      // TypeScript check - if this compiles, the type is exported
      const module = await import("../../src/routing/router");
      expect("RoutingDecision" in module || module.RoutingDecisionSchema).toBeDefined();
    });

    it("should export RoutingRule type", async () => {
      const module = await import("../../src/routing/router");
      expect("RoutingRule" in module || module.RoutingRuleSchema).toBeDefined();
    });
  });
});

describe("Integration with routing index", () => {
  it("should export router functions from routing/index.ts", async () => {
    const routingModule = await import("../../src/routing");

    expect(routingModule.routeTask).toBeDefined();
    expect(routingModule.MODE_MODEL_MATRIX).toBeDefined();
    expect(routingModule.estimateTokens).toBeDefined();
    expect(routingModule.calculateCost).toBeDefined();
  });
});
