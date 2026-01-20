/**
 * Tests for Cost Estimation Module
 *
 * @module tests/routing/estimate
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import type { Mode, AutoModeConfig } from "../../src/config/schema";
import type { UserStory, PRD } from "../../src/prd/types";

// Helper to create mock user stories
function createMockStory(overrides: Partial<UserStory> = {}): UserStory {
  return {
    id: "US-001",
    title: "Test Story",
    description: "A test story for unit testing",
    acceptanceCriteria: ["Criterion 1", "Criterion 2"],
    priority: 1,
    passes: false,
    dependencies: [],
    parallel: false,
    phase: "Foundation",
    ...overrides,
  };
}

// Helper to create mock PRD
function createMockPRD(stories: UserStory[] = [createMockStory()]): PRD {
  return {
    project: "Test Project",
    branchName: "test-branch",
    description: "Test PRD",
    userStories: stories,
  };
}

// Helper to create mock AutoModeConfig
function createMockConfig(overrides: Partial<AutoModeConfig> = {}): AutoModeConfig {
  return {
    enabled: true,
    defaultMode: "good",
    fallbackOrder: ["claude", "codex", "droid", "opencode", "amp", "gemini"],
    modeModels: {
      simple: "sonnet-4.5",
      medium: "sonnet-4.5",
      complex: "opus-4.5",
      expert: "opus-4.5",
    },
    review: {
      promptUser: true,
      defaultMode: "good",
      microTasks: ["typecheck", "lint", "test"],
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

describe("Cost Estimation Module", () => {
  describe("estimateFeatureCost", () => {
    it("should calculate total cost for all incomplete stories", async () => {
      const { estimateFeatureCost } = await import("../../src/routing/estimate");

      const stories = [
        createMockStory({ id: "US-001", passes: false }),
        createMockStory({ id: "US-002", passes: false }),
        createMockStory({ id: "US-003", passes: true }), // Completed - should be skipped
      ];
      const prd = createMockPRD(stories);
      const config = createMockConfig();

      const result = await estimateFeatureCost(prd, config, "good");

      // Should only estimate for 2 incomplete stories
      expect(result.storyEstimates.length).toBe(2);
      expect(result.totalEstimatedCost).toBeGreaterThan(0);
    });

    it("should include escalation buffer in total cost (10-15%)", async () => {
      const { estimateFeatureCost } = await import("../../src/routing/estimate");

      const prd = createMockPRD([createMockStory()]);
      const config = createMockConfig();

      const result = await estimateFeatureCost(prd, config, "good");

      // Total should be >= base cost (has escalation buffer)
      expect(result.totalEstimatedCost).toBeGreaterThanOrEqual(result.baseEstimatedCost);
      // Buffer should be between 10-15%
      const bufferPercent =
        ((result.totalEstimatedCost - result.baseEstimatedCost) / result.baseEstimatedCost) * 100;
      expect(bufferPercent).toBeGreaterThanOrEqual(10);
      expect(bufferPercent).toBeLessThanOrEqual(15);
    });

    it("should calculate baseline cost for comparison", async () => {
      const { estimateFeatureCost } = await import("../../src/routing/estimate");

      const prd = createMockPRD();
      const config = createMockConfig();

      const result = await estimateFeatureCost(prd, config, "cheap");

      // Baseline should use genius mode pricing
      expect(result.baselineCost).toBeGreaterThan(0);
      expect(result.baselineCost).toBeGreaterThanOrEqual(result.totalEstimatedCost);
    });

    it("should calculate savings percentage vs baseline", async () => {
      const { estimateFeatureCost } = await import("../../src/routing/estimate");

      const prd = createMockPRD();
      const config = createMockConfig();

      const result = await estimateFeatureCost(prd, config, "cheap");

      // Should have positive savings for cheap vs genius baseline
      expect(result.savingsPercent).toBeGreaterThan(0);
      expect(result.savingsPercent).toBeLessThan(100);
    });

    it("should return zero savings for genius mode", async () => {
      const { estimateFeatureCost } = await import("../../src/routing/estimate");

      const prd = createMockPRD();
      const config = createMockConfig();

      const result = await estimateFeatureCost(prd, config, "genius");

      // Genius mode IS the baseline, so no savings
      expect(result.savingsPercent).toBe(0);
    });

    it("should return zero cost for free mode", async () => {
      const { estimateFeatureCost } = await import("../../src/routing/estimate");

      const prd = createMockPRD();
      const config = createMockConfig();

      const result = await estimateFeatureCost(prd, config, "free");

      // Free tier models have zero cost
      expect(result.totalEstimatedCost).toBe(0);
      // But baseline should still be calculated
      expect(result.baselineCost).toBeGreaterThan(0);
    });
  });

  describe("estimateStoryCost", () => {
    it("should return complexity level and assigned model", async () => {
      const { estimateStoryCost } = await import("../../src/routing/estimate");

      const story = createMockStory({ title: "Add user authentication with OAuth" });
      const config = createMockConfig();

      const result = await estimateStoryCost(story, config, "good");

      expect(result.complexity).toBeDefined();
      expect(["simple", "medium", "complex", "expert"]).toContain(result.complexity);
      expect(result.harness).toBeDefined();
      expect(result.model).toBeDefined();
    });

    it("should format per-story estimate display string", async () => {
      const { estimateStoryCost } = await import("../../src/routing/estimate");

      const story = createMockStory({ id: "US-001", title: "Test Story" });
      const config = createMockConfig();

      const result = await estimateStoryCost(story, config, "good");

      // Example format: "US-001: medium complexity -> claude/sonnet-4.5 (~$0.15)"
      expect(result.displayString).toContain("US-001");
      expect(result.displayString).toContain("complexity");
      expect(result.displayString).toContain("->");
      expect(result.displayString).toContain("$");
    });

    it("should use token estimation based on story content length", async () => {
      const { estimateStoryCost } = await import("../../src/routing/estimate");

      const shortStory = createMockStory({
        title: "Fix typo",
        description: "Fix",
        acceptanceCriteria: ["Done"],
      });
      const longStory = createMockStory({
        title: "Implement comprehensive user authentication with OAuth 2.0 and JWT tokens",
        description:
          "Create a full authentication system that supports multiple providers including Google, GitHub, and custom email/password login. Must include session management, refresh tokens, and secure password hashing.",
        acceptanceCriteria: [
          "OAuth 2.0 integration with Google",
          "OAuth 2.0 integration with GitHub",
          "Custom email/password authentication",
          "JWT token generation and validation",
          "Session management with Redis",
          "Secure password hashing with bcrypt",
          "Refresh token rotation",
          "Rate limiting on auth endpoints",
        ],
      });

      const config = createMockConfig();

      const shortResult = await estimateStoryCost(shortStory, config, "good");
      const longResult = await estimateStoryCost(longStory, config, "good");

      // Longer story should have more estimated tokens
      expect(longResult.estimatedTokens).toBeGreaterThan(shortResult.estimatedTokens);
    });
  });

  describe("formatCostEstimate", () => {
    it("should format comparison with baseline savings", async () => {
      const { formatCostEstimate } = await import("../../src/routing/estimate");

      const estimate = {
        mode: "cheap" as Mode,
        totalEstimatedCost: 2.5,
        baseEstimatedCost: 2.27,
        baselineCost: 8.75,
        savingsPercent: 71,
        storyEstimates: [],
      };

      const formatted = formatCostEstimate(estimate);

      // Should match: "Estimated cost: $2.50 (vs $8.75 without Auto Mode - 71% savings)"
      expect(formatted).toContain("Estimated cost: $2.50");
      expect(formatted).toContain("$8.75");
      expect(formatted).toContain("71%");
      expect(formatted).toContain("savings");
    });

    it("should format zero cost for free mode", async () => {
      const { formatCostEstimate } = await import("../../src/routing/estimate");

      const estimate = {
        mode: "free" as Mode,
        totalEstimatedCost: 0,
        baseEstimatedCost: 0,
        baselineCost: 5.0,
        savingsPercent: 100,
        storyEstimates: [],
      };

      const formatted = formatCostEstimate(estimate);

      expect(formatted).toContain("$0.00");
      expect(formatted).toContain("100%");
    });
  });

  describe("formatCostBreakdown", () => {
    it("should format per-story breakdown table", async () => {
      const { formatCostBreakdown } = await import("../../src/routing/estimate");

      const estimates = [
        {
          storyId: "US-001",
          title: "Add login",
          complexity: "medium" as const,
          harness: "claude" as const,
          model: "sonnet-4.5",
          estimatedCost: 0.15,
          estimatedTokens: 1500,
          displayString: "US-001: medium complexity -> claude/sonnet-4.5 (~$0.15)",
        },
        {
          storyId: "US-002",
          title: "Add logout",
          complexity: "simple" as const,
          harness: "claude" as const,
          model: "haiku-4.5",
          estimatedCost: 0.05,
          estimatedTokens: 500,
          displayString: "US-002: simple complexity -> claude/haiku-4.5 (~$0.05)",
        },
      ];

      const breakdown = formatCostBreakdown(estimates);

      // Should contain both stories
      expect(breakdown).toContain("US-001");
      expect(breakdown).toContain("US-002");
      // Should contain complexity levels
      expect(breakdown).toContain("medium");
      expect(breakdown).toContain("simple");
      // Should contain models
      expect(breakdown).toContain("sonnet-4.5");
      expect(breakdown).toContain("haiku-4.5");
    });
  });

  describe("compareModes", () => {
    it("should show comparison across all modes", async () => {
      const { compareModes } = await import("../../src/routing/estimate");

      const prd = createMockPRD([
        createMockStory({ id: "US-001" }),
        createMockStory({ id: "US-002" }),
      ]);
      const config = createMockConfig();

      const comparison = await compareModes(prd, config);

      // Should have all 4 modes
      expect(comparison.length).toBe(4);

      // Should include free, cheap, good, genius
      const modes = comparison.map((c) => c.mode);
      expect(modes).toContain("free");
      expect(modes).toContain("cheap");
      expect(modes).toContain("good");
      expect(modes).toContain("genius");

      // Costs should increase from free to genius
      const freeCost = comparison.find((c) => c.mode === "free")?.totalCost ?? 0;
      const cheapCost = comparison.find((c) => c.mode === "cheap")?.totalCost ?? 0;
      const geniusCost = comparison.find((c) => c.mode === "genius")?.totalCost ?? 0;

      expect(freeCost).toBeLessThanOrEqual(cheapCost);
      expect(cheapCost).toBeLessThanOrEqual(geniusCost);
    });

    it("should include savings percentage for each mode", async () => {
      const { compareModes } = await import("../../src/routing/estimate");

      const prd = createMockPRD();
      const config = createMockConfig();

      const comparison = await compareModes(prd, config);

      for (const item of comparison) {
        expect(item.savingsPercent).toBeDefined();
        expect(item.savingsPercent).toBeGreaterThanOrEqual(0);
        expect(item.savingsPercent).toBeLessThanOrEqual(100);
      }

      // Genius mode should have 0% savings (it's the baseline)
      const geniusItem = comparison.find((c) => c.mode === "genius");
      expect(geniusItem?.savingsPercent).toBe(0);
    });
  });

  describe("ESCALATION_BUFFER_PERCENT", () => {
    it("should be between 10 and 15 percent", async () => {
      const { ESCALATION_BUFFER_PERCENT } = await import("../../src/routing/estimate");

      expect(ESCALATION_BUFFER_PERCENT).toBeGreaterThanOrEqual(0.1);
      expect(ESCALATION_BUFFER_PERCENT).toBeLessThanOrEqual(0.15);
    });
  });

  describe("Integration with routeTask", () => {
    it("should use routeTask for complexity classification", async () => {
      const { estimateStoryCost } = await import("../../src/routing/estimate");
      const { routeTask } = await import("../../src/routing/router");

      const story = createMockStory({ title: "Fix typo in README" });
      const config = createMockConfig();

      const estimate = await estimateStoryCost(story, config, "good");

      // Should match what routeTask would return
      const routing = await routeTask(story, config, "good");
      expect(estimate.complexity).toBe(routing.complexity);
      expect(estimate.harness).toBe(routing.harness);
      expect(estimate.model).toBe(routing.model);
    });
  });

  describe("Cost accuracy", () => {
    it("should use model costs from registry", async () => {
      const { estimateStoryCost } = await import("../../src/routing/estimate");
      const { getModelById } = await import("../../src/routing/registry");

      const story = createMockStory();
      const config = createMockConfig();

      const estimate = await estimateStoryCost(story, config, "good");

      // Get the model from registry
      const model = getModelById(estimate.model);
      expect(model).toBeDefined();

      // If the model has costs, the estimate should be based on those costs
      if (model && model.inputCost > 0) {
        expect(estimate.estimatedCost).toBeGreaterThan(0);
      }
    });
  });
});
