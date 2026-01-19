/**
 * @fileoverview Tests for cost reporting functionality (US-025)
 * TDD Red Phase - Tests written before implementation
 */

import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from "bun:test";
import type { Mode, Complexity, HarnessName } from "../../src/config/schema";

// Types we expect to be exported from report.ts
import type {
  StoryExecution,
  FeatureCostReport,
  ModelUtilization,
  CostComparison,
} from "../../src/routing/report";

// Functions we expect to be exported from report.ts
import {
  StoryExecutionSchema,
  FeatureCostReportSchema,
  ModelUtilizationSchema,
  CostComparisonSchema,
  createStoryExecution,
  generateCostReport,
  formatCostReport,
  formatStoryLine,
  formatEscalationLine,
  formatComparisonLine,
  formatUtilizationStats,
  calculateModelUtilization,
  calculateEscalationOverhead,
  saveCostReport,
  loadHistoricalCosts,
  getBaselineCost,
} from "../../src/routing/report";

/**
 * Mock data for testing
 */
const mockStoryExecution = (overrides: Partial<StoryExecution> = {}): StoryExecution => ({
  storyId: "US-001",
  title: "Test Story",
  complexity: "medium" as Complexity,
  initialHarness: "claude" as HarnessName,
  initialModel: "haiku-4.5",
  finalHarness: "claude" as HarnessName,
  finalModel: "haiku-4.5",
  estimatedCost: 0.15,
  actualCost: 0.18,
  inputTokens: 1500,
  outputTokens: 800,
  escalated: false,
  escalations: [],
  duration: 45000, // 45 seconds
  success: true,
  ...overrides,
});

const mockStoryExecutionWithEscalation = (): StoryExecution => ({
  storyId: "US-003",
  title: "Complex Feature",
  complexity: "complex" as Complexity,
  initialHarness: "claude" as HarnessName,
  initialModel: "haiku-4.5",
  finalHarness: "claude" as HarnessName,
  finalModel: "sonnet-4.5",
  estimatedCost: 0.20,
  actualCost: 0.45,
  inputTokens: 2500,
  outputTokens: 1200,
  escalated: true,
  escalations: [
    {
      fromModel: "haiku-4.5",
      toModel: "sonnet-4.5",
      reason: "Task failed with haiku-4.5",
      additionalCost: 0.20,
    },
  ],
  duration: 120000, // 2 minutes
  success: true,
});

describe("Cost Reporting (US-025)", () => {
  describe("StoryExecutionSchema", () => {
    it("should validate a valid story execution", () => {
      const execution = mockStoryExecution();
      const result = StoryExecutionSchema.safeParse(execution);
      expect(result.success).toBe(true);
    });

    it("should validate a story execution with escalation", () => {
      const execution = mockStoryExecutionWithEscalation();
      const result = StoryExecutionSchema.safeParse(execution);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.escalated).toBe(true);
        expect(result.data.escalations.length).toBe(1);
      }
    });

    it("should require storyId field", () => {
      const execution = mockStoryExecution();
      // @ts-expect-error - intentionally testing missing field
      delete execution.storyId;
      const result = StoryExecutionSchema.safeParse(execution);
      expect(result.success).toBe(false);
    });

    it("should require actualCost field", () => {
      const execution = mockStoryExecution();
      // @ts-expect-error - intentionally testing missing field
      delete execution.actualCost;
      const result = StoryExecutionSchema.safeParse(execution);
      expect(result.success).toBe(false);
    });

    it("should require inputTokens field", () => {
      const execution = mockStoryExecution();
      // @ts-expect-error - intentionally testing missing field
      delete execution.inputTokens;
      const result = StoryExecutionSchema.safeParse(execution);
      expect(result.success).toBe(false);
    });

    it("should require outputTokens field", () => {
      const execution = mockStoryExecution();
      // @ts-expect-error - intentionally testing missing field
      delete execution.outputTokens;
      const result = StoryExecutionSchema.safeParse(execution);
      expect(result.success).toBe(false);
    });
  });

  describe("FeatureCostReportSchema", () => {
    it("should validate a valid feature cost report", () => {
      const report: FeatureCostReport = {
        featureName: "test-feature",
        mode: "good" as Mode,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        storyExecutions: [mockStoryExecution()],
        totalEstimatedCost: 0.15,
        totalActualCost: 0.18,
        baselineCost: 0.50,
        savingsPercent: 64,
        estimateAccuracy: 83.3,
        totalInputTokens: 1500,
        totalOutputTokens: 800,
        escalationCount: 0,
        escalationOverheadPercent: 0,
        modelUtilization: {
          free: 0,
          cheap: 100,
          standard: 0,
          premium: 0,
          sota: 0,
        },
      };
      const result = FeatureCostReportSchema.safeParse(report);
      expect(result.success).toBe(true);
    });

    it("should include all required fields", () => {
      const report = {
        featureName: "test-feature",
        mode: "good",
      };
      const result = FeatureCostReportSchema.safeParse(report);
      expect(result.success).toBe(false);
    });
  });

  describe("ModelUtilizationSchema", () => {
    it("should validate model utilization stats", () => {
      const utilization: ModelUtilization = {
        free: 40,
        cheap: 35,
        standard: 10,
        premium: 10,
        sota: 5,
      };
      const result = ModelUtilizationSchema.safeParse(utilization);
      expect(result.success).toBe(true);
    });

    it("should allow values between 0 and 100", () => {
      const utilization = {
        free: 100,
        cheap: 0,
        standard: 0,
        premium: 0,
        sota: 0,
      };
      const result = ModelUtilizationSchema.safeParse(utilization);
      expect(result.success).toBe(true);
    });
  });

  describe("createStoryExecution()", () => {
    it("should create a story execution from routing decision and escalation result", () => {
      // This function bridges the gap between routing and execution
      const routingDecision = {
        harness: "claude" as HarnessName,
        model: "haiku-4.5",
        complexity: "simple" as Complexity,
        mode: "cheap" as Mode,
        estimatedCost: 0.10,
        reasoning: "Simple task routed to cheap model",
      };

      const escalationResult = {
        success: true,
        finalHarness: "claude" as HarnessName,
        finalModel: "haiku-4.5",
        attempts: 1,
        escalations: [],
        actualCost: 0.12,
        blocked: false,
      };

      const story = { id: "US-001", title: "Test Story" };
      const tokens = { input: 1000, output: 500 };
      const duration = 30000;

      const execution = createStoryExecution(
        story,
        routingDecision,
        escalationResult,
        tokens,
        duration
      );

      expect(execution.storyId).toBe("US-001");
      expect(execution.title).toBe("Test Story");
      expect(execution.complexity).toBe("simple");
      expect(execution.initialHarness).toBe("claude");
      expect(execution.initialModel).toBe("haiku-4.5");
      expect(execution.finalHarness).toBe("claude");
      expect(execution.finalModel).toBe("haiku-4.5");
      expect(execution.estimatedCost).toBe(0.10);
      expect(execution.actualCost).toBe(0.12);
      expect(execution.inputTokens).toBe(1000);
      expect(execution.outputTokens).toBe(500);
      expect(execution.escalated).toBe(false);
      expect(execution.success).toBe(true);
    });

    it("should track escalations correctly", () => {
      const routingDecision = {
        harness: "claude" as HarnessName,
        model: "haiku-4.5",
        complexity: "complex" as Complexity,
        mode: "good" as Mode,
        estimatedCost: 0.15,
        reasoning: "Complex task",
      };

      const escalationResult = {
        success: true,
        finalHarness: "claude" as HarnessName,
        finalModel: "sonnet-4.5",
        attempts: 2,
        escalations: [
          {
            attempt: 1,
            harness: "claude" as HarnessName,
            model: "haiku-4.5",
            result: "failure" as const,
            error: "Task failed",
            cost: 0.05,
            duration: 15000,
          },
          {
            attempt: 2,
            harness: "claude" as HarnessName,
            model: "sonnet-4.5",
            result: "success" as const,
            cost: 0.25,
            duration: 30000,
          },
        ],
        actualCost: 0.30,
        blocked: false,
      };

      const story = { id: "US-003", title: "Complex Feature" };
      const tokens = { input: 2000, output: 1000 };
      const duration = 45000;

      const execution = createStoryExecution(
        story,
        routingDecision,
        escalationResult,
        tokens,
        duration
      );

      expect(execution.escalated).toBe(true);
      expect(execution.finalModel).toBe("sonnet-4.5");
      expect(execution.escalations.length).toBeGreaterThan(0);
    });
  });

  describe("generateCostReport()", () => {
    it("should generate a complete cost report from story executions", () => {
      const executions = [
        mockStoryExecution(),
        mockStoryExecution({ storyId: "US-002", actualCost: 0.22 }),
      ];

      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        executions,
        new Date().toISOString(),
        new Date().toISOString()
      );

      expect(report.featureName).toBe("test-feature");
      expect(report.mode).toBe("good");
      expect(report.storyExecutions.length).toBe(2);
      expect(report.totalActualCost).toBeCloseTo(0.40);
    });

    it("should calculate total estimated cost", () => {
      const executions = [
        mockStoryExecution({ estimatedCost: 0.10 }),
        mockStoryExecution({ storyId: "US-002", estimatedCost: 0.20 }),
      ];

      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        executions,
        new Date().toISOString(),
        new Date().toISOString()
      );

      expect(report.totalEstimatedCost).toBeCloseTo(0.30);
    });

    it("should calculate savings percentage vs baseline (SOTA)", () => {
      // Using larger token counts to generate a higher baseline cost
      // Baseline = (100000/1000000 * 15) + (50000/1000000 * 75) = 1.5 + 3.75 = 5.25
      const executions = [
        mockStoryExecution({ actualCost: 2.00, inputTokens: 100000, outputTokens: 50000 }),
      ];

      const report = generateCostReport(
        "test-feature",
        "cheap" as Mode,
        executions,
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Savings should be calculated vs SOTA pricing
      // With baseline of 5.25 and actual of 2.00, savings should be ~62%
      expect(report.savingsPercent).toBeGreaterThan(0);
      expect(report.baselineCost).toBeGreaterThan(report.totalActualCost);
    });

    it("should calculate estimate accuracy percentage", () => {
      const executions = [
        mockStoryExecution({ estimatedCost: 0.10, actualCost: 0.12 }),
      ];

      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        executions,
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Accuracy = 100 - |estimated - actual| / estimated * 100
      // With estimated 0.10 and actual 0.12: |0.12 - 0.10| / 0.10 * 100 = 20%
      // So accuracy = 100 - 20 = 80%
      expect(report.estimateAccuracy).toBeCloseTo(80, 0);
    });

    it("should track total input/output tokens", () => {
      const executions = [
        mockStoryExecution({ inputTokens: 1000, outputTokens: 500 }),
        mockStoryExecution({ storyId: "US-002", inputTokens: 2000, outputTokens: 1000 }),
      ];

      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        executions,
        new Date().toISOString(),
        new Date().toISOString()
      );

      expect(report.totalInputTokens).toBe(3000);
      expect(report.totalOutputTokens).toBe(1500);
    });

    it("should count escalations", () => {
      const executions = [
        mockStoryExecution(),
        mockStoryExecutionWithEscalation(),
      ];

      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        executions,
        new Date().toISOString(),
        new Date().toISOString()
      );

      expect(report.escalationCount).toBe(1);
    });
  });

  describe("calculateModelUtilization()", () => {
    it("should calculate model tier utilization percentages", () => {
      const executions = [
        mockStoryExecution({ finalModel: "haiku-4.5" }), // cheap tier
        mockStoryExecution({ storyId: "US-002", finalModel: "haiku-4.5" }), // cheap tier
        mockStoryExecution({ storyId: "US-003", finalModel: "opus-4.5" }), // sota tier
      ];

      const utilization = calculateModelUtilization(executions);

      // 2 out of 3 stories used cheap tier = ~67%
      // 1 out of 3 stories used sota tier = ~33%
      expect(utilization.cheap).toBeCloseTo(66.67, 0);
      expect(utilization.sota).toBeCloseTo(33.33, 0);
      expect(utilization.free).toBe(0);
      expect(utilization.standard).toBe(0);
      expect(utilization.premium).toBe(0);
    });

    it("should handle free tier models", () => {
      const executions = [
        mockStoryExecution({ finalModel: "glm-4.7", finalHarness: "opencode" as HarnessName }),
        mockStoryExecution({ storyId: "US-002", finalModel: "amp-free", finalHarness: "amp" as HarnessName }),
      ];

      const utilization = calculateModelUtilization(executions);

      expect(utilization.free).toBe(100);
      expect(utilization.cheap).toBe(0);
    });

    it("should format utilization as: 'Free models: 40%, Cheap: 35%, SOTA: 25%'", () => {
      const utilization: ModelUtilization = {
        free: 40,
        cheap: 35,
        standard: 0,
        premium: 0,
        sota: 25,
      };

      const formatted = formatUtilizationStats(utilization);

      expect(formatted).toContain("Free models: 40%");
      expect(formatted).toContain("Cheap: 35%");
      expect(formatted).toContain("SOTA: 25%");
    });
  });

  describe("calculateEscalationOverhead()", () => {
    it("should calculate escalation overhead percentage", () => {
      const executions = [
        mockStoryExecution({ actualCost: 0.18, estimatedCost: 0.15, escalated: false }),
        mockStoryExecutionWithEscalation(), // actualCost: 0.45, estimatedCost: 0.20
      ];

      const overhead = calculateEscalationOverhead(executions);

      // Overhead is the additional cost from escalations as % of total cost
      // Escalated story had +$0.25 additional cost, total was $0.63
      expect(overhead).toBeGreaterThan(0);
    });

    it("should return 0 when no escalations occurred", () => {
      const executions = [
        mockStoryExecution({ escalated: false }),
        mockStoryExecution({ storyId: "US-002", escalated: false }),
      ];

      const overhead = calculateEscalationOverhead(executions);

      expect(overhead).toBe(0);
    });
  });

  describe("formatCostReport()", () => {
    it("should format actual cost with savings percentage", () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [mockStoryExecution({ actualCost: 2.75 })],
        new Date().toISOString(),
        new Date().toISOString()
      );

      const formatted = formatCostReport(report);

      // "Actual cost: $2.75 (saved 68% vs single-model execution)"
      expect(formatted).toContain("Actual cost:");
      expect(formatted).toContain("$");
      expect(formatted).toContain("saved");
      expect(formatted).toContain("%");
    });

    it("should include per-story breakdown", () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [
          mockStoryExecution(),
          mockStoryExecution({ storyId: "US-002" }),
        ],
        new Date().toISOString(),
        new Date().toISOString()
      );

      const formatted = formatCostReport(report);

      expect(formatted).toContain("US-001");
      expect(formatted).toContain("US-002");
    });

    it("should show escalation costs clearly", () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [mockStoryExecutionWithEscalation()],
        new Date().toISOString(),
        new Date().toISOString()
      );

      const formatted = formatCostReport(report);

      // "US-003: escalated haiku-4.5 -> sonnet-4.5 (+$0.20)"
      expect(formatted).toContain("escalated");
      expect(formatted).toContain("->");
      expect(formatted).toContain("+$");
    });

    it("should compare estimated vs actual", () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [mockStoryExecution({ estimatedCost: 2.50, actualCost: 2.75 })],
        new Date().toISOString(),
        new Date().toISOString()
      );

      const formatted = formatCostReport(report);

      // "Estimated: $2.50, Actual: $2.75 (+10%)"
      expect(formatted).toContain("Estimated:");
      expect(formatted).toContain("Actual:");
    });

    it("should include escalation overhead percentage", () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [mockStoryExecutionWithEscalation()],
        new Date().toISOString(),
        new Date().toISOString()
      );

      const formatted = formatCostReport(report);

      expect(formatted).toContain("overhead");
    });

    it("should include model utilization stats", () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [
          mockStoryExecution({ finalModel: "haiku-4.5" }),
          mockStoryExecution({ storyId: "US-002", finalModel: "opus-4.5" }),
        ],
        new Date().toISOString(),
        new Date().toISOString()
      );

      const formatted = formatCostReport(report);

      expect(formatted).toContain("Model utilization");
    });

    it("should include token usage", () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [mockStoryExecution()],
        new Date().toISOString(),
        new Date().toISOString()
      );

      const formatted = formatCostReport(report);

      expect(formatted).toContain("tokens");
    });
  });

  describe("formatStoryLine()", () => {
    it("should format non-escalated story", () => {
      const execution = mockStoryExecution();
      const line = formatStoryLine(execution);

      // "US-001: medium complexity -> claude/haiku-4.5 ($0.18)"
      expect(line).toContain("US-001");
      expect(line).toContain("medium");
      expect(line).toContain("claude");
      expect(line).toContain("haiku-4.5");
      expect(line).toContain("$0.18");
    });

    it("should include initial and final model for escalated story", () => {
      const execution = mockStoryExecutionWithEscalation();
      const line = formatStoryLine(execution);

      // Should show both initial and final model
      expect(line).toContain("haiku-4.5");
      expect(line).toContain("sonnet-4.5");
    });
  });

  describe("formatEscalationLine()", () => {
    it("should format escalation details", () => {
      const execution = mockStoryExecutionWithEscalation();
      const line = formatEscalationLine(execution);

      // "US-003: escalated haiku-4.5 -> sonnet-4.5 (+$0.20)"
      expect(line).toContain("US-003");
      expect(line).toContain("escalated");
      expect(line).toContain("haiku-4.5");
      expect(line).toContain("sonnet-4.5");
      expect(line).toContain("+$0.20");
    });
  });

  describe("formatComparisonLine()", () => {
    it("should format estimated vs actual comparison", () => {
      const line = formatComparisonLine(2.50, 2.75);

      // "Estimated: $2.50, Actual: $2.75 (+10%)"
      expect(line).toContain("Estimated: $2.50");
      expect(line).toContain("Actual: $2.75");
      expect(line).toContain("+10%");
    });

    it("should show negative percentage when under budget", () => {
      const line = formatComparisonLine(2.50, 2.25);

      expect(line).toContain("-10%");
    });
  });

  describe("saveCostReport()", () => {
    it("should append cost report to progress.txt with timestamp", async () => {
      const report = generateCostReport(
        "test-feature",
        "good" as Mode,
        [mockStoryExecution()],
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Mock file system
      const mockWriteFile = mock(() => Promise.resolve());
      const mockReadFile = mock(() => Promise.resolve("existing content\n"));

      await saveCostReport(report, "/tmp/test-feature/progress.txt", {
        writeFile: mockWriteFile,
        readFile: mockReadFile,
      });

      expect(mockWriteFile).toHaveBeenCalled();
      const writtenContent = mockWriteFile.mock.calls[0]![1] as string;
      expect(writtenContent).toContain("## Cost Report");
      expect(writtenContent).toContain("Actual cost:");
    });
  });

  describe("loadHistoricalCosts()", () => {
    it("should load cost reports from progress.txt", async () => {
      const mockContent = `
## 2026-01-19 - US-001
Some progress...

---

## Cost Report - 2026-01-19T10:00:00Z
Feature: test-feature
Mode: good
Actual cost: $2.75 (saved 68% vs single-model execution)

---

## Cost Report - 2026-01-19T12:00:00Z
Feature: test-feature
Mode: cheap
Actual cost: $1.50 (saved 82% vs single-model execution)
`;

      const mockReadFile = mock(() => Promise.resolve(mockContent));

      const history = await loadHistoricalCosts("/tmp/test-feature/progress.txt", {
        readFile: mockReadFile,
      });

      expect(history.length).toBe(2);
      expect(history[0]!.mode).toBe("good");
      expect(history[1]!.mode).toBe("cheap");
    });

    it("should return empty array if no cost reports found", async () => {
      const mockContent = `
## 2026-01-19 - US-001
Some progress...
`;

      const mockReadFile = mock(() => Promise.resolve(mockContent));

      const history = await loadHistoricalCosts("/tmp/test-feature/progress.txt", {
        readFile: mockReadFile,
      });

      expect(history.length).toBe(0);
    });

    it("should return empty array if file doesn't exist", async () => {
      const mockReadFile = mock(() => Promise.reject(new Error("ENOENT")));

      const history = await loadHistoricalCosts("/tmp/test-feature/progress.txt", {
        readFile: mockReadFile,
      });

      expect(history.length).toBe(0);
    });
  });

  describe("getBaselineCost()", () => {
    it("should calculate baseline cost using SOTA pricing", () => {
      const inputTokens = 1000;
      const outputTokens = 500;

      const baselineCost = getBaselineCost(inputTokens, outputTokens);

      // Should use Opus 4.5 pricing (SOTA)
      // Opus: $15/MTok input, $75/MTok output
      // Expected: (1000/1000000 * 15) + (500/1000000 * 75) = 0.015 + 0.0375 = 0.0525
      expect(baselineCost).toBeCloseTo(0.0525, 4);
    });
  });

  describe("CostComparisonSchema", () => {
    it("should validate a cost comparison result", () => {
      const comparison: CostComparison = {
        estimated: 2.50,
        actual: 2.75,
        difference: 0.25,
        differencePercent: 10,
        overBudget: true,
      };
      const result = CostComparisonSchema.safeParse(comparison);
      expect(result.success).toBe(true);
    });
  });
});
