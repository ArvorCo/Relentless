/**
 * CLI --mode Flag Tests
 *
 * Tests for the `--mode` flag on the `relentless run` command.
 * Following TDD: Tests written first, implementation comes after.
 *
 * @module tests/cli/mode-flag.test.ts
 */

import { describe, it, expect } from "bun:test";
import type { Mode } from "../../src/config/schema";

// Import the mode validation module
import {
  isValidModeFlag,
  parseModeFlagValue,
  getModeDescription,
  getModeHelpText,
  DEFAULT_MODE,
  VALID_MODES,
  type ModeFlagOptions,
  type ModeFlagResult,
} from "../../src/cli/mode-flag";

describe("CLI --mode Flag", () => {
  describe("VALID_MODES constant", () => {
    it("should include all four valid modes", () => {
      expect(VALID_MODES).toContain("free");
      expect(VALID_MODES).toContain("cheap");
      expect(VALID_MODES).toContain("good");
      expect(VALID_MODES).toContain("genius");
    });

    it("should have exactly 4 modes", () => {
      expect(VALID_MODES.length).toBe(4);
    });
  });

  describe("DEFAULT_MODE constant", () => {
    it("should be 'good'", () => {
      expect(DEFAULT_MODE).toBe("good");
    });
  });

  describe("isValidModeFlag", () => {
    it("should return true for 'free'", () => {
      expect(isValidModeFlag("free")).toBe(true);
    });

    it("should return true for 'cheap'", () => {
      expect(isValidModeFlag("cheap")).toBe(true);
    });

    it("should return true for 'good'", () => {
      expect(isValidModeFlag("good")).toBe(true);
    });

    it("should return true for 'genius'", () => {
      expect(isValidModeFlag("genius")).toBe(true);
    });

    it("should return false for invalid mode", () => {
      expect(isValidModeFlag("invalid")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidModeFlag("")).toBe(false);
    });

    it("should be case-sensitive (uppercase)", () => {
      expect(isValidModeFlag("FREE")).toBe(false);
      expect(isValidModeFlag("Good")).toBe(false);
      expect(isValidModeFlag("GENIUS")).toBe(false);
    });

    it("should return false for similar but invalid modes", () => {
      expect(isValidModeFlag("fast")).toBe(false);
      expect(isValidModeFlag("best")).toBe(false);
      expect(isValidModeFlag("smart")).toBe(false);
      expect(isValidModeFlag("auto")).toBe(false);
    });
  });

  describe("parseModeFlagValue", () => {
    it("should return valid mode when provided", () => {
      const result = parseModeFlagValue("genius");
      expect(result.valid).toBe(true);
      expect(result.mode).toBe("genius");
      expect(result.error).toBeUndefined();
    });

    it("should return default mode when undefined", () => {
      const result = parseModeFlagValue(undefined);
      expect(result.valid).toBe(true);
      expect(result.mode).toBe("good");
    });

    it("should return error for invalid mode", () => {
      const result = parseModeFlagValue("invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Invalid mode");
    });

    it("should include valid options in error message", () => {
      const result = parseModeFlagValue("wrong");
      expect(result.error).toContain("free");
      expect(result.error).toContain("cheap");
      expect(result.error).toContain("good");
      expect(result.error).toContain("genius");
    });

    it("should handle empty string as invalid", () => {
      const result = parseModeFlagValue("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid mode");
    });

    it("should trim whitespace", () => {
      const result = parseModeFlagValue("  good  ");
      expect(result.valid).toBe(true);
      expect(result.mode).toBe("good");
    });
  });

  describe("getModeDescription", () => {
    it("should return description for free mode", () => {
      const desc = getModeDescription("free");
      expect(desc).toContain("free");
      expect(desc.length).toBeGreaterThan(0);
    });

    it("should return description for cheap mode", () => {
      const desc = getModeDescription("cheap");
      expect(desc).toContain("low-cost");
    });

    it("should return description for good mode", () => {
      const desc = getModeDescription("good");
      expect(desc).toContain("balanced");
    });

    it("should return description for genius mode", () => {
      const desc = getModeDescription("genius");
      expect(desc).toContain("SOTA");
    });

    it("should include savings percentage for cheap mode", () => {
      const desc = getModeDescription("cheap");
      expect(desc).toMatch(/\d+%/);
    });

    it("should indicate default mode", () => {
      const desc = getModeDescription("good");
      expect(desc).toContain("default");
    });
  });

  describe("getModeHelpText", () => {
    it("should include all mode options", () => {
      const help = getModeHelpText();
      expect(help).toContain("free");
      expect(help).toContain("cheap");
      expect(help).toContain("good");
      expect(help).toContain("genius");
    });

    it("should include descriptions for each mode", () => {
      const help = getModeHelpText();
      expect(help).toContain("free tier");
      expect(help).toContain("low-cost");
      expect(help).toContain("balanced");
      expect(help).toContain("SOTA");
    });

    it("should indicate the default mode", () => {
      const help = getModeHelpText();
      expect(help).toContain("default");
    });

    it("should mention savings for cost-effective modes", () => {
      const help = getModeHelpText();
      expect(help).toMatch(/\d+%.*savings|saves.*\d+%/i);
    });
  });
});
