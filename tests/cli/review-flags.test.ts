/**
 * CLI Review Control Flags Tests
 *
 * Tests for the --skip-review and --review-mode CLI flags.
 * Follows TDD approach - tests written before implementation.
 */

import { describe, it, expect } from "bun:test";
import {
  VALID_REVIEW_MODES,
  DEFAULT_REVIEW_MODE,
  parseReviewFlagsValue,
  getReviewFlagsHelpText,
  logReviewFlagsSelection,
} from "../../src/cli/review-flags";

describe("CLI Review Control Flags", () => {
  describe("VALID_REVIEW_MODES", () => {
    it("should contain all four valid modes", () => {
      expect(VALID_REVIEW_MODES).toHaveLength(4);
    });

    it("should include free", () => {
      expect(VALID_REVIEW_MODES).toContain("free");
    });

    it("should include cheap", () => {
      expect(VALID_REVIEW_MODES).toContain("cheap");
    });

    it("should include good", () => {
      expect(VALID_REVIEW_MODES).toContain("good");
    });

    it("should include genius", () => {
      expect(VALID_REVIEW_MODES).toContain("genius");
    });
  });

  describe("DEFAULT_REVIEW_MODE", () => {
    it("should default to good", () => {
      expect(DEFAULT_REVIEW_MODE).toBe("good");
    });
  });

  describe("parseReviewFlagsValue", () => {
    describe("--skip-review flag", () => {
      it("should return skipped when skipReview is true", () => {
        const result = parseReviewFlagsValue({ skipReview: true });
        expect(result.valid).toBe(true);
        expect(result.skipReview).toBe(true);
        expect(result.reviewMode).toBeUndefined();
      });

      it("should include skip warning message", () => {
        const result = parseReviewFlagsValue({ skipReview: true });
        expect(result.warningMessage).toContain("skip");
      });

      it("should work with skipReview only", () => {
        const result = parseReviewFlagsValue({ skipReview: true, reviewMode: undefined });
        expect(result.valid).toBe(true);
        expect(result.skipReview).toBe(true);
      });
    });

    describe("--review-mode flag", () => {
      it("should accept free mode", () => {
        const result = parseReviewFlagsValue({ reviewMode: "free" });
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe("free");
      });

      it("should accept cheap mode", () => {
        const result = parseReviewFlagsValue({ reviewMode: "cheap" });
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe("cheap");
      });

      it("should accept good mode", () => {
        const result = parseReviewFlagsValue({ reviewMode: "good" });
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe("good");
      });

      it("should accept genius mode", () => {
        const result = parseReviewFlagsValue({ reviewMode: "genius" });
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe("genius");
      });

      it("should return error for invalid mode", () => {
        const result = parseReviewFlagsValue({ reviewMode: "invalid" });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid");
      });

      it("should include valid modes in error message", () => {
        const result = parseReviewFlagsValue({ reviewMode: "invalid" });
        expect(result.error).toContain("free");
        expect(result.error).toContain("genius");
      });

      it("should trim whitespace from mode", () => {
        const result = parseReviewFlagsValue({ reviewMode: " genius " });
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe("genius");
      });
    });

    describe("default behavior", () => {
      it("should use default mode when no flags provided", () => {
        const result = parseReviewFlagsValue({});
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe(DEFAULT_REVIEW_MODE);
        expect(result.skipReview).toBe(false);
      });

      it("should use default mode when both flags undefined", () => {
        const result = parseReviewFlagsValue({ skipReview: undefined, reviewMode: undefined });
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe(DEFAULT_REVIEW_MODE);
      });

      it("should use default mode when skipReview is false and no reviewMode", () => {
        const result = parseReviewFlagsValue({ skipReview: false });
        expect(result.valid).toBe(true);
        expect(result.reviewMode).toBe(DEFAULT_REVIEW_MODE);
      });
    });

    describe("mutual exclusivity", () => {
      it("should return error when both --skip-review and --review-mode provided", () => {
        const result = parseReviewFlagsValue({ skipReview: true, reviewMode: "genius" });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("mutually exclusive");
      });

      it("should mention both flags in error message", () => {
        const result = parseReviewFlagsValue({ skipReview: true, reviewMode: "free" });
        expect(result.error).toContain("--skip-review");
        expect(result.error).toContain("--review-mode");
      });
    });

    describe("case sensitivity", () => {
      it("should be case-sensitive (GENIUS is invalid)", () => {
        const result = parseReviewFlagsValue({ reviewMode: "GENIUS" });
        expect(result.valid).toBe(false);
      });

      it("should be case-sensitive (Good is invalid)", () => {
        const result = parseReviewFlagsValue({ reviewMode: "Good" });
        expect(result.valid).toBe(false);
      });
    });
  });

  describe("getReviewFlagsHelpText", () => {
    it("should include --skip-review description", () => {
      const helpText = getReviewFlagsHelpText();
      expect(helpText).toContain("--skip-review");
    });

    it("should include --review-mode description", () => {
      const helpText = getReviewFlagsHelpText();
      expect(helpText).toContain("--review-mode");
    });

    it("should explain mutual exclusivity", () => {
      const helpText = getReviewFlagsHelpText();
      expect(helpText.toLowerCase()).toContain("exclusive");
    });

    it("should list all valid modes", () => {
      const helpText = getReviewFlagsHelpText();
      expect(helpText).toContain("free");
      expect(helpText).toContain("cheap");
      expect(helpText).toContain("good");
      expect(helpText).toContain("genius");
    });

    it("should indicate default mode", () => {
      const helpText = getReviewFlagsHelpText();
      expect(helpText.toLowerCase()).toContain("default");
    });
  });

  describe("logReviewFlagsSelection", () => {
    it("should log skip message when review is skipped", () => {
      const logs: string[] = [];
      const logger = (message: string) => logs.push(message);

      logReviewFlagsSelection({ skipReview: true, reviewMode: undefined }, logger);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].toLowerCase()).toContain("skip");
    });

    it("should log review mode when set", () => {
      const logs: string[] = [];
      const logger = (message: string) => logs.push(message);

      logReviewFlagsSelection({ skipReview: false, reviewMode: "genius" }, logger);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain("genius");
    });

    it("should mention review in log message", () => {
      const logs: string[] = [];
      const logger = (message: string) => logs.push(message);

      logReviewFlagsSelection({ skipReview: false, reviewMode: "good" }, logger);

      expect(logs[0].toLowerCase()).toContain("review");
    });

    it("should log warning format when skipping", () => {
      const logs: string[] = [];
      const logger = (message: string) => logs.push(message);

      logReviewFlagsSelection({ skipReview: true, reviewMode: undefined }, logger);

      // Should indicate it's a warning (skip is not recommended)
      expect(logs[0]).toMatch(/warning|skipped|not performed/i);
    });
  });
});
