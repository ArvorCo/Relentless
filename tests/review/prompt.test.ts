/**
 * Tests for the Review Prompt Module
 *
 * Tests the interactive prompts for final review before feature completion.
 *
 * @module tests/review/prompt.test.ts
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import type { Mode } from "../../src/config/schema";
import type { ReviewSummary } from "../../src/review/types";
import {
  promptForReview,
  isValidMode,
  formatSummaryMessage,
  type ReviewPromptOptions,
  type ReviewPromptResult,
} from "../../src/review/prompt";

// Mock implementations for testing
const mockReviewSummary: ReviewSummary = {
  tasksRun: 6,
  tasksPassed: 6,
  tasksFailed: 0,
  fixTasksGenerated: 0,
  totalDuration: 1234,
  estimatedCost: 0.03,
  actualCost: 0.025,
  mode: "good",
  results: [],
};

const mockFailedReviewSummary: ReviewSummary = {
  tasksRun: 6,
  tasksPassed: 4,
  tasksFailed: 2,
  fixTasksGenerated: 5,
  totalDuration: 2345,
  estimatedCost: 0.03,
  actualCost: 0.03,
  mode: "good",
  results: [],
};

describe("Review Prompt Module", () => {
  describe("promptForReview", () => {
    let logs: string[];
    let mockLogger: (message: string) => void;
    let mockRunReview: (mode: Mode) => Promise<ReviewSummary>;
    let mockEstimateCost: (mode: Mode) => number;

    beforeEach(() => {
      logs = [];
      mockLogger = (message: string) => logs.push(message);
      mockRunReview = async () => mockReviewSummary;
      mockEstimateCost = (mode: Mode) => {
        const costs: Record<Mode, number> = {
          free: 0,
          cheap: 0.01,
          good: 0.03,
          genius: 0.15,
        };
        return costs[mode];
      };
    });

    describe("--skip-review flag", () => {
      it("should skip review and log warning when --skip-review is provided", async () => {
        const result = await promptForReview({
          skipReview: true,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.reviewRan).toBe(false);
        expect(result.skipped).toBe(true);
        expect(result.cancelled).toBe(false);
        expect(logs.some((l) => l.includes("Skipping final review"))).toBe(
          true
        );
      });

      it("should include 'Review: SKIPPED' in summary message when skipped", async () => {
        const result = await promptForReview({
          skipReview: true,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.summaryMessage).toContain("Review: SKIPPED");
      });

      it("should take precedence over --review-mode when both provided", async () => {
        const result = await promptForReview({
          skipReview: true,
          reviewMode: "genius",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.reviewRan).toBe(false);
        expect(result.skipped).toBe(true);
        expect(result.mode).toBeUndefined();
      });
    });

    describe("--review-mode flag", () => {
      it("should use provided mode without prompting", async () => {
        const result = await promptForReview({
          reviewMode: "genius",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.reviewRan).toBe(true);
        expect(result.mode).toBe("genius");
      });

      it("should run review with cheap mode when specified", async () => {
        const result = await promptForReview({
          reviewMode: "cheap",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.mode).toBe("cheap");
        expect(result.reviewRan).toBe(true);
      });

      it("should run review with free mode when specified", async () => {
        const result = await promptForReview({
          reviewMode: "free",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.mode).toBe("free");
        expect(logs.some((l) => l.includes("less thorough"))).toBe(true);
      });

      it("should display estimated cost for genius mode", async () => {
        const result = await promptForReview({
          reviewMode: "genius",
          logger: mockLogger,
          runReview: mockRunReview,
          estimateCost: mockEstimateCost,
        });

        expect(logs.some((l) => l.includes("Estimated review cost"))).toBe(
          true
        );
      });
    });

    describe("interactive mode selection", () => {
      it("should prompt for review confirmation first", async () => {
        let promptCount = 0;
        const mockReadInput = async () => {
          promptCount++;
          if (promptCount === 1) return "y"; // First prompt: Run review?
          return "good"; // Second prompt: Mode selection
        };

        await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(logs.some((l) => l.includes("Run final review?"))).toBe(true);
      });

      it("should skip review when user answers 'n'", async () => {
        const mockReadInput = async () => "n";

        const result = await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.reviewRan).toBe(false);
        expect(result.skipped).toBe(true);
        expect(logs.some((l) => l.includes("Skipping final review"))).toBe(
          true
        );
      });

      it("should skip review when user answers 'no'", async () => {
        const mockReadInput = async () => "no";

        const result = await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.skipped).toBe(true);
      });

      it("should prompt for mode selection when user answers 'y'", async () => {
        let promptCount = 0;
        const mockReadInput = async () => {
          promptCount++;
          if (promptCount === 1) return "y";
          return "good";
        };

        await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(logs.some((l) => l.includes("Review mode?"))).toBe(true);
      });

      it("should use 'good' as default mode when Enter pressed", async () => {
        let promptCount = 0;
        const mockReadInput = async () => {
          promptCount++;
          if (promptCount === 1) return "y";
          return ""; // Empty input = default
        };

        const result = await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.mode).toBe("good");
      });

      it("should accept 'yes' as confirmation", async () => {
        let promptCount = 0;
        const mockReadInput = async () => {
          promptCount++;
          if (promptCount === 1) return "yes";
          return "good";
        };

        const result = await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.reviewRan).toBe(true);
      });

      it("should display 'Invalid mode' and re-prompt on invalid input", async () => {
        let promptCount = 0;
        const mockReadInput = async () => {
          promptCount++;
          if (promptCount === 1) return "y";
          if (promptCount === 2) return "invalid";
          return "good";
        };

        const result = await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(logs.some((l) => l.includes("Invalid mode"))).toBe(true);
        expect(result.mode).toBe("good");
      });

      it("should accept all valid mode values", async () => {
        for (const mode of ["free", "cheap", "good", "genius"]) {
          let promptCount = 0;
          const mockReadInput = async () => {
            promptCount++;
            if (promptCount === 1) return "y";
            return mode;
          };

          logs = [];
          const result = await promptForReview({
            readInput: mockReadInput,
            logger: mockLogger,
            runReview: mockRunReview,
          });

          expect(result.mode).toBe(mode as Mode);
        }
      });
    });

    describe("non-interactive mode (CI/CD)", () => {
      it("should use --review-mode without prompting in non-interactive mode", async () => {
        const result = await promptForReview({
          nonInteractive: true,
          reviewMode: "cheap",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.mode).toBe("cheap");
        expect(result.reviewRan).toBe(true);
      });

      it("should use default mode 'good' without prompting in non-interactive mode", async () => {
        const result = await promptForReview({
          nonInteractive: true,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.mode).toBe("good");
        expect(result.reviewRan).toBe(true);
      });
    });

    describe("cancellation handling", () => {
      it("should handle Ctrl+C gracefully and mark as cancelled", async () => {
        const mockReadInput = async () => {
          throw new Error("SIGINT");
        };

        const result = await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.cancelled).toBe(true);
        expect(result.reviewRan).toBe(false);
      });

      it("should mark feature as incomplete on cancellation", async () => {
        const mockReadInput = async () => {
          throw new Error("SIGINT");
        };

        const result = await promptForReview({
          readInput: mockReadInput,
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.summaryMessage).toContain("cancelled");
      });
    });

    describe("review execution", () => {
      it("should run review and return summary on success", async () => {
        const result = await promptForReview({
          reviewMode: "good",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.summary).toBeDefined();
        expect(result.summary?.tasksRun).toBe(6);
      });

      it("should include 'Review: PASSED' in summary for successful review", async () => {
        const result = await promptForReview({
          reviewMode: "good",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(result.summaryMessage).toContain("Review: PASSED");
        expect(result.summaryMessage).toContain("good mode");
        expect(result.summaryMessage).toContain("6 checks");
      });

      it("should include 'Review: FAILED' in summary for failed review", async () => {
        const failedRunReview = async () => mockFailedReviewSummary;

        const result = await promptForReview({
          reviewMode: "good",
          logger: mockLogger,
          runReview: failedRunReview,
        });

        expect(result.summaryMessage).toContain("Review: FAILED");
        expect(result.summaryMessage).toContain("5 issues");
      });
    });

    describe("mode-specific messages", () => {
      it("should display warning for free mode about thoroughness", async () => {
        await promptForReview({
          reviewMode: "free",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(
          logs.some(
            (l) => l.includes("free models") && l.includes("less thorough")
          )
        ).toBe(true);
      });

      it("should display estimated cost for genius mode", async () => {
        await promptForReview({
          reviewMode: "genius",
          logger: mockLogger,
          runReview: mockRunReview,
          estimateCost: mockEstimateCost,
        });

        expect(
          logs.some(
            (l) => l.includes("Estimated review cost") && l.includes("$0.15")
          )
        ).toBe(true);
      });

      it("should not display cost warning for cheap mode", async () => {
        await promptForReview({
          reviewMode: "cheap",
          logger: mockLogger,
          runReview: mockRunReview,
          estimateCost: mockEstimateCost,
        });

        expect(logs.some((l) => l.includes("Estimated review cost"))).toBe(
          false
        );
      });

      it("should not display thoroughness warning for good mode", async () => {
        await promptForReview({
          reviewMode: "good",
          logger: mockLogger,
          runReview: mockRunReview,
        });

        expect(logs.some((l) => l.includes("less thorough"))).toBe(false);
      });
    });
  });

  describe("isValidMode", () => {
    it("should return true for valid modes", () => {
      expect(isValidMode("free")).toBe(true);
      expect(isValidMode("cheap")).toBe(true);
      expect(isValidMode("good")).toBe(true);
      expect(isValidMode("genius")).toBe(true);
    });

    it("should return false for invalid modes", () => {
      expect(isValidMode("invalid")).toBe(false);
      expect(isValidMode("")).toBe(false);
      expect(isValidMode("best")).toBe(false);
      expect(isValidMode("fast")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isValidMode("FREE")).toBe(false);
      expect(isValidMode("Good")).toBe(false);
      expect(isValidMode("GENIUS")).toBe(false);
    });
  });

  describe("formatSummaryMessage", () => {
    it("should format skipped summary correctly", () => {
      const message = formatSummaryMessage({
        reviewRan: false,
        skipped: true,
        cancelled: false,
        summaryMessage: "",
      });

      expect(message).toBe("Review: SKIPPED");
    });

    it("should format cancelled summary correctly", () => {
      const message = formatSummaryMessage({
        reviewRan: false,
        skipped: false,
        cancelled: true,
        summaryMessage: "",
      });

      expect(message).toContain("cancelled");
    });

    it("should format passed summary with mode and task count", () => {
      const message = formatSummaryMessage({
        reviewRan: true,
        skipped: false,
        cancelled: false,
        mode: "good",
        summary: mockReviewSummary,
        summaryMessage: "",
      });

      expect(message).toBe("Review: PASSED (good mode, 6 checks)");
    });

    it("should format failed summary with issue count", () => {
      const message = formatSummaryMessage({
        reviewRan: true,
        skipped: false,
        cancelled: false,
        mode: "good",
        summary: mockFailedReviewSummary,
        summaryMessage: "",
      });

      expect(message).toBe("Review: FAILED (5 issues)");
    });
  });
});
