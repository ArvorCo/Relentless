/**
 * CLI --fallback-order Flag Tests
 *
 * Tests for the --fallback-order CLI flag validation and parsing.
 * Follows TDD approach - tests written before implementation.
 */

import { describe, it, expect } from "bun:test";
import {
  VALID_HARNESSES,
  DEFAULT_FALLBACK_ORDER,
  isValidHarnessName,
  parseFallbackOrderValue,
  getFallbackOrderHelpText,
  logFallbackOrderSelection,
} from "../../src/cli/fallback-order";

describe("CLI --fallback-order Flag", () => {
  describe("VALID_HARNESSES", () => {
    it("should contain all six valid harness names", () => {
      expect(VALID_HARNESSES).toHaveLength(6);
    });

    it("should include claude", () => {
      expect(VALID_HARNESSES).toContain("claude");
    });

    it("should include codex", () => {
      expect(VALID_HARNESSES).toContain("codex");
    });

    it("should include droid", () => {
      expect(VALID_HARNESSES).toContain("droid");
    });

    it("should include opencode", () => {
      expect(VALID_HARNESSES).toContain("opencode");
    });

    it("should include amp", () => {
      expect(VALID_HARNESSES).toContain("amp");
    });

    it("should include gemini", () => {
      expect(VALID_HARNESSES).toContain("gemini");
    });
  });

  describe("DEFAULT_FALLBACK_ORDER", () => {
    it("should default to claude > codex > droid > opencode > amp > gemini", () => {
      expect(DEFAULT_FALLBACK_ORDER).toEqual([
        "claude",
        "codex",
        "droid",
        "opencode",
        "amp",
        "gemini",
      ]);
    });

    it("should have six harnesses", () => {
      expect(DEFAULT_FALLBACK_ORDER).toHaveLength(6);
    });

    it("should start with claude", () => {
      expect(DEFAULT_FALLBACK_ORDER[0]).toBe("claude");
    });
  });

  describe("isValidHarnessName", () => {
    it("should return true for claude", () => {
      expect(isValidHarnessName("claude")).toBe(true);
    });

    it("should return true for codex", () => {
      expect(isValidHarnessName("codex")).toBe(true);
    });

    it("should return true for droid", () => {
      expect(isValidHarnessName("droid")).toBe(true);
    });

    it("should return true for opencode", () => {
      expect(isValidHarnessName("opencode")).toBe(true);
    });

    it("should return true for amp", () => {
      expect(isValidHarnessName("amp")).toBe(true);
    });

    it("should return true for gemini", () => {
      expect(isValidHarnessName("gemini")).toBe(true);
    });

    it("should return false for invalid harness names", () => {
      expect(isValidHarnessName("invalid")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidHarnessName("")).toBe(false);
    });

    it("should be case-sensitive (CLAUDE is invalid)", () => {
      expect(isValidHarnessName("CLAUDE")).toBe(false);
    });

    it("should be case-sensitive (Claude is invalid)", () => {
      expect(isValidHarnessName("Claude")).toBe(false);
    });
  });

  describe("parseFallbackOrderValue", () => {
    it("should return default order when value is undefined", () => {
      const result = parseFallbackOrderValue(undefined);
      expect(result.valid).toBe(true);
      expect(result.order).toEqual(DEFAULT_FALLBACK_ORDER);
    });

    it("should parse comma-separated harness names", () => {
      const result = parseFallbackOrderValue("opencode,droid,claude");
      expect(result.valid).toBe(true);
      expect(result.order).toEqual(["opencode", "droid", "claude"]);
    });

    it("should return error for invalid harness name", () => {
      const result = parseFallbackOrderValue("invalid,claude");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid harness");
      expect(result.error).toContain("invalid");
    });

    it("should include valid harnesses in error message", () => {
      const result = parseFallbackOrderValue("invalid");
      expect(result.error).toContain("claude");
      expect(result.error).toContain("codex");
    });

    it("should deduplicate harness names", () => {
      const result = parseFallbackOrderValue("claude,claude,codex");
      expect(result.valid).toBe(true);
      expect(result.order).toEqual(["claude", "codex"]);
    });

    it("should set warning when duplicates are removed", () => {
      const result = parseFallbackOrderValue("claude,claude,codex");
      expect(result.warning).toContain("Duplicate");
    });

    it("should trim whitespace from harness names", () => {
      const result = parseFallbackOrderValue(" claude , codex ");
      expect(result.valid).toBe(true);
      expect(result.order).toEqual(["claude", "codex"]);
    });

    it("should return error for empty string", () => {
      const result = parseFallbackOrderValue("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("should return error for only whitespace", () => {
      const result = parseFallbackOrderValue("   ");
      expect(result.valid).toBe(false);
    });

    it("should allow partial fallback order", () => {
      const result = parseFallbackOrderValue("droid,claude");
      expect(result.valid).toBe(true);
      expect(result.order).toEqual(["droid", "claude"]);
      expect(result.order).toHaveLength(2);
    });

    it("should preserve order of specified harnesses", () => {
      const result = parseFallbackOrderValue("gemini,amp,opencode");
      expect(result.order?.[0]).toBe("gemini");
      expect(result.order?.[1]).toBe("amp");
      expect(result.order?.[2]).toBe("opencode");
    });

    it("should handle single harness", () => {
      const result = parseFallbackOrderValue("claude");
      expect(result.valid).toBe(true);
      expect(result.order).toEqual(["claude"]);
    });
  });

  describe("getFallbackOrderHelpText", () => {
    it("should include header", () => {
      const helpText = getFallbackOrderHelpText();
      expect(helpText).toContain("Fallback order");
    });

    it("should include all valid harness names", () => {
      const helpText = getFallbackOrderHelpText();
      expect(helpText).toContain("claude");
      expect(helpText).toContain("codex");
      expect(helpText).toContain("droid");
      expect(helpText).toContain("opencode");
      expect(helpText).toContain("amp");
      expect(helpText).toContain("gemini");
    });

    it("should explain the purpose", () => {
      const helpText = getFallbackOrderHelpText();
      expect(helpText).toContain("rate");
    });

    it("should show default order", () => {
      const helpText = getFallbackOrderHelpText();
      expect(helpText.toLowerCase()).toContain("default");
    });
  });

  describe("logFallbackOrderSelection", () => {
    it("should log fallback order using provided logger", () => {
      const logs: string[] = [];
      const logger = (message: string) => logs.push(message);

      logFallbackOrderSelection(["claude", "codex"], logger);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain("claude");
      expect(logs[0]).toContain("codex");
    });

    it("should include 'Fallback order' in log message", () => {
      const logs: string[] = [];
      const logger = (message: string) => logs.push(message);

      logFallbackOrderSelection(["droid", "amp"], logger);

      expect(logs[0]).toContain("Fallback order");
    });

    it("should format as arrow-separated list", () => {
      const logs: string[] = [];
      const logger = (message: string) => logs.push(message);

      logFallbackOrderSelection(["claude", "codex", "droid"], logger);

      // Should be formatted like "claude > codex > droid" or "claude → codex → droid"
      expect(logs[0]).toMatch(/(>|→)/);
    });
  });
});
