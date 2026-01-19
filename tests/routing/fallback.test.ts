/**
 * Harness Fallback Chain Tests
 *
 * Tests for the harness fallback logic that automatically skips to the next
 * harness in the fallback chain when the current harness is unavailable.
 *
 * @module tests/routing/fallback
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import type { HarnessName, AutoModeConfig, Mode } from "../../src/config/schema";

// Note: We'll import the actual functions after we create them
// For now, we define the expected interface

// Expected types
interface HarnessAvailability {
  available: boolean;
  reason?: string;
  cooldownUntil?: Date;
}

interface FallbackResult {
  harness: HarnessName;
  model: string;
  fallbacksUsed: string[];
  allUnavailable: boolean;
  reason?: string;
}

// Helper to create test auto mode config
function createTestAutoModeConfig(
  overrides: Partial<AutoModeConfig> = {}
): AutoModeConfig {
  return {
    enabled: true,
    defaultMode: "good" as Mode,
    fallbackOrder: ["claude", "codex", "droid", "opencode", "amp", "gemini"] as HarnessName[],
    modeModels: {
      simple: "haiku-4.5",
      medium: "sonnet-4.5",
      complex: "opus-4.5",
      expert: "opus-4.5",
    },
    review: {
      promptUser: true,
      defaultMode: "good" as Mode,
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

describe("Harness Fallback Chain", () => {
  describe("Default fallback order", () => {
    it("should have default order: claude > codex > droid > opencode > amp > gemini", () => {
      const config = createTestAutoModeConfig();
      expect(config.fallbackOrder).toEqual([
        "claude",
        "codex",
        "droid",
        "opencode",
        "amp",
        "gemini",
      ]);
    });

    it("should allow custom fallback order via config", () => {
      const config = createTestAutoModeConfig({
        fallbackOrder: ["droid", "claude", "amp"] as HarnessName[],
      });
      expect(config.fallbackOrder).toEqual(["droid", "claude", "amp"]);
    });
  });

  describe("getAvailableHarness() function", () => {
    // Note: We'll import this after implementing
    // For now these tests define expected behavior

    it("should return first available harness in fallback order", async () => {
      // Import after implementation
      const { getAvailableHarness, resetCooldowns, setHarnessInstalled } = await import(
        "../../src/routing/fallback"
      );

      // Reset state for clean test
      resetCooldowns();

      // Mock all harnesses as installed
      setHarnessInstalled("claude", true);
      setHarnessInstalled("codex", true);

      const config = createTestAutoModeConfig();
      // Skip API key check in tests since env vars aren't set
      const result = await getAvailableHarness(config.fallbackOrder, { skipApiKeyCheck: true });

      expect(result.available).toBe(true);
      expect(result.harness).toBe("claude");
    });

    it("should skip to next harness if first is not installed", async () => {
      const { getAvailableHarness, resetCooldowns, setHarnessInstalled } = await import(
        "../../src/routing/fallback"
      );

      resetCooldowns();

      // Claude not installed, Codex is
      setHarnessInstalled("claude", false);
      setHarnessInstalled("codex", true);
      setHarnessInstalled("droid", true);

      // Skip API key check in tests since env vars aren't set
      const result = await getAvailableHarness(["claude", "codex", "droid"] as HarnessName[], {
        skipApiKeyCheck: true,
      });

      expect(result.available).toBe(true);
      expect(result.harness).toBe("codex");
      expect(result.reason).toContain("not installed");
    });

    it("should skip harness that is rate limited", async () => {
      const { getAvailableHarness, resetCooldowns, setHarnessInstalled, markHarnessRateLimited } =
        await import("../../src/routing/fallback");

      resetCooldowns();

      setHarnessInstalled("claude", true);
      setHarnessInstalled("codex", true);

      // Mark Claude as rate limited
      markHarnessRateLimited("claude");

      // Skip API key check in tests since env vars aren't set
      const result = await getAvailableHarness(["claude", "codex"] as HarnessName[], {
        skipApiKeyCheck: true,
      });

      expect(result.available).toBe(true);
      expect(result.harness).toBe("codex");
    });

    it("should return unavailable if all harnesses in fallback order are unavailable", async () => {
      const { getAvailableHarness, resetCooldowns, setHarnessInstalled } = await import(
        "../../src/routing/fallback"
      );

      resetCooldowns();

      // All harnesses not installed
      setHarnessInstalled("claude", false);
      setHarnessInstalled("codex", false);

      const result = await getAvailableHarness(["claude", "codex"] as HarnessName[]);

      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("Rate limit detection", () => {
    it("should detect HTTP 429 as rate limit", async () => {
      const { isRateLimitError } = await import("../../src/routing/fallback");

      expect(isRateLimitError("HTTP 429 Too Many Requests")).toBe(true);
      expect(isRateLimitError("Error: 429")).toBe(true);
    });

    it("should detect 'rate limit exceeded' message", async () => {
      const { isRateLimitError } = await import("../../src/routing/fallback");

      expect(isRateLimitError("rate limit exceeded")).toBe(true);
      expect(isRateLimitError("Rate Limit Exceeded")).toBe(true);
      expect(isRateLimitError("You have exceeded the rate limit")).toBe(true);
    });

    it("should detect 'quota exhausted' message", async () => {
      const { isRateLimitError } = await import("../../src/routing/fallback");

      expect(isRateLimitError("quota exhausted")).toBe(true);
      expect(isRateLimitError("Quota Exhausted")).toBe(true);
      expect(isRateLimitError("Your quota has been exhausted")).toBe(true);
    });

    it("should not detect regular errors as rate limit", async () => {
      const { isRateLimitError } = await import("../../src/routing/fallback");

      expect(isRateLimitError("TypeError: Cannot read property")).toBe(false);
      expect(isRateLimitError("Connection refused")).toBe(false);
      expect(isRateLimitError("Invalid API key")).toBe(false);
    });
  });

  describe("Harness cooldown management", () => {
    it("should mark harness as unavailable for cooldown period after rate limit", async () => {
      const {
        markHarnessRateLimited,
        isHarnessOnCooldown,
        resetCooldowns,
        DEFAULT_COOLDOWN_MS,
      } = await import("../../src/routing/fallback");

      resetCooldowns();

      markHarnessRateLimited("claude");

      expect(isHarnessOnCooldown("claude")).toBe(true);
      expect(isHarnessOnCooldown("codex")).toBe(false);
    });

    it("should use default cooldown period of 60 seconds", async () => {
      const { DEFAULT_COOLDOWN_MS } = await import("../../src/routing/fallback");

      expect(DEFAULT_COOLDOWN_MS).toBe(60000);
    });

    it("should clear cooldown after period expires", async () => {
      const { markHarnessRateLimited, isHarnessOnCooldown, resetCooldowns, setCooldownEnd } =
        await import("../../src/routing/fallback");

      resetCooldowns();

      // Set cooldown that has already expired
      const pastTime = new Date(Date.now() - 1000);
      setCooldownEnd("claude", pastTime);

      expect(isHarnessOnCooldown("claude")).toBe(false);
    });

    it("should allow custom cooldown period via markHarnessRateLimited", async () => {
      const { markHarnessRateLimited, getCooldownEnd, resetCooldowns } = await import(
        "../../src/routing/fallback"
      );

      resetCooldowns();

      const customCooldown = 30000; // 30 seconds
      markHarnessRateLimited("claude", customCooldown);

      const cooldownEnd = getCooldownEnd("claude");
      expect(cooldownEnd).toBeDefined();

      // Should be approximately 30 seconds from now
      const expectedEnd = Date.now() + customCooldown;
      expect(cooldownEnd!.getTime()).toBeGreaterThan(expectedEnd - 1000);
      expect(cooldownEnd!.getTime()).toBeLessThan(expectedEnd + 1000);
    });

    it("should maintain cooldown state in memory during session", async () => {
      const { markHarnessRateLimited, isHarnessOnCooldown, resetCooldowns } = await import(
        "../../src/routing/fallback"
      );

      resetCooldowns();

      markHarnessRateLimited("claude");
      markHarnessRateLimited("codex");

      expect(isHarnessOnCooldown("claude")).toBe(true);
      expect(isHarnessOnCooldown("codex")).toBe(true);
      expect(isHarnessOnCooldown("droid")).toBe(false);
    });

    it("should reset all cooldowns when resetCooldowns is called", async () => {
      const { markHarnessRateLimited, isHarnessOnCooldown, resetCooldowns } = await import(
        "../../src/routing/fallback"
      );

      markHarnessRateLimited("claude");
      markHarnessRateLimited("codex");

      resetCooldowns();

      expect(isHarnessOnCooldown("claude")).toBe(false);
      expect(isHarnessOnCooldown("codex")).toBe(false);
    });
  });

  describe("API key detection", () => {
    it("should check for ANTHROPIC_API_KEY for Claude", async () => {
      const { getRequiredEnvVar } = await import("../../src/routing/fallback");

      expect(getRequiredEnvVar("claude")).toBe("ANTHROPIC_API_KEY");
    });

    it("should check for OPENAI_API_KEY for Codex", async () => {
      const { getRequiredEnvVar } = await import("../../src/routing/fallback");

      expect(getRequiredEnvVar("codex")).toBe("OPENAI_API_KEY");
    });

    it("should return undefined for harnesses without API key requirement", async () => {
      const { getRequiredEnvVar } = await import("../../src/routing/fallback");

      // OpenCode uses free models, no API key required
      expect(getRequiredEnvVar("opencode")).toBeUndefined();
    });

    it("should check for GOOGLE_API_KEY for Gemini", async () => {
      const { getRequiredEnvVar } = await import("../../src/routing/fallback");

      expect(getRequiredEnvVar("gemini")).toBe("GOOGLE_API_KEY");
    });
  });

  describe("Logging harness unavailability", () => {
    it("should log when harness is unavailable with reason", async () => {
      const { formatUnavailableMessage } = await import("../../src/routing/fallback");

      const message = formatUnavailableMessage("claude", "not installed", "codex");
      expect(message).toContain("claude");
      expect(message).toContain("not installed");
      expect(message).toContain("codex");
    });

    it("should log rate limited with next harness info", async () => {
      const { formatUnavailableMessage } = await import("../../src/routing/fallback");

      const message = formatUnavailableMessage("claude", "rate_limited", "codex");
      expect(message).toContain("claude");
      expect(message).toContain("rate_limited");
      expect(message).toContain("codex");
    });
  });

  describe("Free mode harness constraints", () => {
    it("should identify harnesses with free models", async () => {
      const { hasFreeTierModel } = await import("../../src/routing/fallback");

      // OpenCode has free models (glm-4.7, etc.)
      expect(hasFreeTierModel("opencode")).toBe(true);
      // Amp has free mode
      expect(hasFreeTierModel("amp")).toBe(true);
      // Droid has free model (glm-4.6)
      expect(hasFreeTierModel("droid")).toBe(true);
      // Gemini has free flash model
      expect(hasFreeTierModel("gemini")).toBe(true);
    });

    it("should filter fallback order for free mode", async () => {
      const { getFreeModeHarnesses } = await import("../../src/routing/fallback");

      const allHarnesses: HarnessName[] = [
        "claude",
        "codex",
        "droid",
        "opencode",
        "amp",
        "gemini",
      ];
      const freeHarnesses = getFreeModeHarnesses(allHarnesses);

      // Free mode should only include harnesses with free models
      expect(freeHarnesses).toContain("opencode");
      expect(freeHarnesses).toContain("amp");
      expect(freeHarnesses).toContain("droid");
      expect(freeHarnesses).toContain("gemini");
      // Claude and Codex don't have free models
      expect(freeHarnesses).not.toContain("claude");
      expect(freeHarnesses).not.toContain("codex");
    });

    it("should fall back only to free harnesses when in free mode", async () => {
      const { getAvailableHarness, resetCooldowns, setHarnessInstalled } = await import(
        "../../src/routing/fallback"
      );

      resetCooldowns();

      // All harnesses installed
      setHarnessInstalled("claude", true);
      setHarnessInstalled("codex", true);
      setHarnessInstalled("droid", true);
      setHarnessInstalled("opencode", true);
      setHarnessInstalled("amp", true);
      setHarnessInstalled("gemini", true);

      const result = await getAvailableHarness(
        ["claude", "codex", "droid", "opencode", "amp", "gemini"] as HarnessName[],
        { freeMode: true }
      );

      // Should skip claude and codex (no free models) and return first free harness
      expect(result.available).toBe(true);
      expect(["droid", "opencode", "amp", "gemini"]).toContain(result.harness);
    });
  });

  describe("Fallback event recording", () => {
    it("should record fallback events with proper result type", async () => {
      const { createFallbackEvent } = await import("../../src/routing/fallback");

      const event = createFallbackEvent("claude", "rate_limited", "codex");

      expect(event.harness).toBe("claude");
      expect(event.result).toBe("rate_limited");
      expect(event.error).toContain("rate_limited");
    });

    it("should record unavailable events", async () => {
      const { createFallbackEvent } = await import("../../src/routing/fallback");

      const event = createFallbackEvent("codex", "unavailable", "droid");

      expect(event.harness).toBe("codex");
      expect(event.result).toBe("unavailable");
    });
  });

  describe("selectHarnessWithFallback() integration", () => {
    it("should select appropriate harness considering all constraints", async () => {
      const {
        selectHarnessWithFallback,
        resetCooldowns,
        setHarnessInstalled,
        markHarnessRateLimited,
      } = await import("../../src/routing/fallback");

      resetCooldowns();

      // Claude installed but rate limited
      setHarnessInstalled("claude", true);
      markHarnessRateLimited("claude");

      // Codex not installed
      setHarnessInstalled("codex", false);

      // Droid available
      setHarnessInstalled("droid", true);

      const config = createTestAutoModeConfig({
        fallbackOrder: ["claude", "codex", "droid"] as HarnessName[],
      });

      const result = await selectHarnessWithFallback(config);

      expect(result.harness).toBe("droid");
      expect(result.fallbacksUsed).toContain("claude");
      expect(result.fallbacksUsed).toContain("codex");
    });

    it("should mark task as blocked when all harnesses unavailable", async () => {
      const { selectHarnessWithFallback, resetCooldowns, setHarnessInstalled } = await import(
        "../../src/routing/fallback"
      );

      resetCooldowns();

      setHarnessInstalled("claude", false);
      setHarnessInstalled("codex", false);

      const config = createTestAutoModeConfig({
        fallbackOrder: ["claude", "codex"] as HarnessName[],
      });

      const result = await selectHarnessWithFallback(config);

      expect(result.allUnavailable).toBe(true);
      expect(result.reason).toContain("unavailable");
    });
  });

  describe("getModelForHarnessAndMode()", () => {
    it("should return correct model for harness and mode combination", async () => {
      const { getModelForHarnessAndMode } = await import("../../src/routing/fallback");

      // Free mode should return free model for opencode
      expect(getModelForHarnessAndMode("opencode", "free", "simple")).toBe("glm-4.7");
      expect(getModelForHarnessAndMode("amp", "free", "medium")).toBe("amp-free");
      expect(getModelForHarnessAndMode("gemini", "free", "complex")).toBe("gemini-3-flash");
    });

    it("should return appropriate model for non-free modes", async () => {
      const { getModelForHarnessAndMode } = await import("../../src/routing/fallback");

      // Cheap mode for claude should use haiku for simple
      expect(getModelForHarnessAndMode("claude", "cheap", "simple")).toBe("haiku-4.5");
      expect(getModelForHarnessAndMode("claude", "good", "complex")).toBe("opus-4.5");
    });
  });
});
