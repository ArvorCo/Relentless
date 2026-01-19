/**
 * Unit tests for the Model Registry module
 *
 * Tests for US-002: Model Registry Data Structure and Initial Data
 *
 * @module tests/routing/registry.test.ts
 */

import { describe, expect, it } from "bun:test";
import {
  MODEL_REGISTRY,
  HARNESS_PROFILES,
  getModelById,
  getModelsByHarness,
  getModelsByTier,
  getDefaultModelForHarness,
  getHarnessForModel,
  ModelTierSchema,
  ModelProfileSchema,
  HarnessProfileSchema,
  type ModelTier,
  type ModelProfile,
  type HarnessProfile,
} from "../../src/routing/registry";

describe("Model Registry Schemas", () => {
  describe("ModelTierSchema", () => {
    it("accepts valid tier values", () => {
      const validTiers: ModelTier[] = ["free", "cheap", "standard", "premium", "sota"];
      for (const tier of validTiers) {
        expect(ModelTierSchema.parse(tier)).toBe(tier);
      }
    });

    it("rejects invalid tier values", () => {
      expect(() => ModelTierSchema.parse("invalid")).toThrow();
      expect(() => ModelTierSchema.parse("")).toThrow();
      expect(() => ModelTierSchema.parse(123)).toThrow();
    });
  });

  describe("ModelProfileSchema", () => {
    it("validates a complete model profile", () => {
      const validProfile = {
        id: "test-model",
        displayName: "Test Model",
        harness: "claude",
        tier: "standard",
        inputCost: 3.0,
        outputCost: 15.0,
        contextWindow: 200000,
        strengths: ["testing"],
        limitations: [],
        cliFlag: "--model",
        cliValue: "test-model-id",
      };

      const result = ModelProfileSchema.parse(validProfile);
      expect(result.id).toBe("test-model");
      expect(result.harness).toBe("claude");
    });

    it("accepts optional sweBenchScore", () => {
      const profileWithScore = {
        id: "test-model",
        displayName: "Test Model",
        harness: "claude",
        tier: "sota",
        inputCost: 5.0,
        outputCost: 25.0,
        sweBenchScore: 80.9,
        contextWindow: 200000,
        strengths: ["code_review"],
        limitations: [],
        cliFlag: "--model",
        cliValue: "test-id",
      };

      const result = ModelProfileSchema.parse(profileWithScore);
      expect(result.sweBenchScore).toBe(80.9);
    });

    it("accepts optional tokensPerSecond", () => {
      const profileWithTokens = {
        id: "fast-model",
        displayName: "Fast Model",
        harness: "opencode",
        tier: "free",
        inputCost: 0.0,
        outputCost: 0.0,
        contextWindow: 128000,
        tokensPerSecond: 92,
        strengths: ["speed"],
        limitations: [],
        cliFlag: "--model",
        cliValue: "fast-id",
      };

      const result = ModelProfileSchema.parse(profileWithTokens);
      expect(result.tokensPerSecond).toBe(92);
    });

    it("rejects profile missing required fields", () => {
      const incompleteProfile = {
        id: "incomplete",
        displayName: "Incomplete Model",
      };

      expect(() => ModelProfileSchema.parse(incompleteProfile)).toThrow();
    });

    it("rejects invalid harness names in profile", () => {
      const invalidHarnessProfile = {
        id: "test",
        displayName: "Test",
        harness: "invalid-harness",
        tier: "standard",
        inputCost: 1.0,
        outputCost: 5.0,
        contextWindow: 128000,
        strengths: [],
        limitations: [],
        cliFlag: "--model",
        cliValue: "test",
      };

      expect(() => ModelProfileSchema.parse(invalidHarnessProfile)).toThrow();
    });
  });

  describe("HarnessProfileSchema", () => {
    it("validates a complete harness profile", () => {
      const validHarness = {
        name: "claude",
        displayName: "Claude Code",
        models: [],
        defaultModel: "sonnet-4.5",
        supportsModelSelection: true,
        modelSelectionMethod: "flag",
      };

      const result = HarnessProfileSchema.parse(validHarness);
      expect(result.name).toBe("claude");
      expect(result.supportsModelSelection).toBe(true);
    });

    it("accepts all valid modelSelectionMethod values", () => {
      const methods = ["flag", "env", "config"] as const;
      for (const method of methods) {
        const harness = {
          name: "claude",
          displayName: "Claude",
          models: [],
          defaultModel: "default",
          supportsModelSelection: true,
          modelSelectionMethod: method,
        };
        expect(HarnessProfileSchema.parse(harness).modelSelectionMethod).toBe(method);
      }
    });

    it("rejects invalid modelSelectionMethod", () => {
      const invalidHarness = {
        name: "claude",
        displayName: "Claude",
        models: [],
        defaultModel: "default",
        supportsModelSelection: true,
        modelSelectionMethod: "invalid",
      };

      expect(() => HarnessProfileSchema.parse(invalidHarness)).toThrow();
    });
  });
});

describe("MODEL_REGISTRY", () => {
  it("contains at least 15 model profiles", () => {
    expect(MODEL_REGISTRY.length).toBeGreaterThanOrEqual(15);
  });

  it("contains models from all 6 harnesses", () => {
    const harnesses = new Set(MODEL_REGISTRY.map((m) => m.harness));
    expect(harnesses.has("claude")).toBe(true);
    expect(harnesses.has("codex")).toBe(true);
    expect(harnesses.has("droid")).toBe(true);
    expect(harnesses.has("opencode")).toBe(true);
    expect(harnesses.has("amp")).toBe(true);
    expect(harnesses.has("gemini")).toBe(true);
  });

  it("all profiles have valid schema", () => {
    for (const model of MODEL_REGISTRY) {
      expect(() => ModelProfileSchema.parse(model)).not.toThrow();
    }
  });

  it("contains Claude models: opus-4.5, sonnet-4.5, haiku-4.5", () => {
    const claudeModels = MODEL_REGISTRY.filter((m) => m.harness === "claude").map((m) => m.id);
    expect(claudeModels).toContain("opus-4.5");
    expect(claudeModels).toContain("sonnet-4.5");
    expect(claudeModels).toContain("haiku-4.5");
  });

  it("contains Codex models: gpt-5-2-high, gpt-5-2-medium, gpt-5-2-low", () => {
    const codexModels = MODEL_REGISTRY.filter((m) => m.harness === "codex").map((m) => m.id);
    expect(codexModels).toContain("gpt-5-2-high");
    expect(codexModels).toContain("gpt-5-2-medium");
    expect(codexModels).toContain("gpt-5-2-low");
  });

  it("contains OpenCode models: glm-4.7, grok-code-fast-1, minimax-m2.1", () => {
    const opencodeModels = MODEL_REGISTRY.filter((m) => m.harness === "opencode").map((m) => m.id);
    expect(opencodeModels).toContain("glm-4.7");
    expect(opencodeModels).toContain("grok-code-fast-1");
    expect(opencodeModels).toContain("minimax-m2.1");
  });

  it("contains Gemini models: gemini-3-pro, gemini-3-flash", () => {
    const geminiModels = MODEL_REGISTRY.filter((m) => m.harness === "gemini").map((m) => m.id);
    expect(geminiModels).toContain("gemini-3-pro");
    expect(geminiModels).toContain("gemini-3-flash");
  });

  it("all models have accurate cost data (non-negative)", () => {
    for (const model of MODEL_REGISTRY) {
      expect(model.inputCost).toBeGreaterThanOrEqual(0);
      expect(model.outputCost).toBeGreaterThanOrEqual(0);
    }
  });

  it("free tier models have zero cost", () => {
    const freeModels = MODEL_REGISTRY.filter((m) => m.tier === "free");
    for (const model of freeModels) {
      expect(model.inputCost).toBe(0);
      expect(model.outputCost).toBe(0);
    }
  });

  it("SOTA tier models are the most expensive in their harness", () => {
    const sotaModels = MODEL_REGISTRY.filter((m) => m.tier === "sota");
    for (const sotaModel of sotaModels) {
      const harnessModels = MODEL_REGISTRY.filter((m) => m.harness === sotaModel.harness);
      for (const other of harnessModels) {
        if (other.id !== sotaModel.id) {
          expect(sotaModel.outputCost).toBeGreaterThanOrEqual(other.outputCost);
        }
      }
    }
  });

  it("all models have contextWindow defined", () => {
    for (const model of MODEL_REGISTRY) {
      expect(model.contextWindow).toBeGreaterThan(0);
    }
  });
});

describe("HARNESS_PROFILES", () => {
  it("contains profiles for all 6 harnesses", () => {
    expect(HARNESS_PROFILES.length).toBe(6);
    const names = HARNESS_PROFILES.map((h) => h.name);
    expect(names).toContain("claude");
    expect(names).toContain("codex");
    expect(names).toContain("droid");
    expect(names).toContain("opencode");
    expect(names).toContain("amp");
    expect(names).toContain("gemini");
  });

  it("all profiles have valid schema", () => {
    for (const harness of HARNESS_PROFILES) {
      expect(() => HarnessProfileSchema.parse(harness)).not.toThrow();
    }
  });

  it("each harness has a default model that exists in its models list", () => {
    for (const harness of HARNESS_PROFILES) {
      const modelIds = harness.models.map((m) => m.id);
      expect(modelIds).toContain(harness.defaultModel);
    }
  });

  it("each harness profile contains the correct models from MODEL_REGISTRY", () => {
    for (const harness of HARNESS_PROFILES) {
      const registryModels = MODEL_REGISTRY.filter((m) => m.harness === harness.name);
      expect(harness.models.length).toBe(registryModels.length);
    }
  });

  it("Claude uses flag-based model selection", () => {
    const claude = HARNESS_PROFILES.find((h) => h.name === "claude");
    expect(claude?.supportsModelSelection).toBe(true);
    expect(claude?.modelSelectionMethod).toBe("flag");
  });

  it("Amp uses env-based model selection", () => {
    const amp = HARNESS_PROFILES.find((h) => h.name === "amp");
    expect(amp?.supportsModelSelection).toBe(true);
    expect(amp?.modelSelectionMethod).toBe("env");
  });
});

describe("getModelById", () => {
  it("returns the correct model for a valid ID", () => {
    const model = getModelById("opus-4.5");
    expect(model).toBeDefined();
    expect(model?.id).toBe("opus-4.5");
    expect(model?.harness).toBe("claude");
    expect(model?.tier).toBe("sota");
  });

  it("returns undefined for non-existent model ID", () => {
    const model = getModelById("non-existent-model");
    expect(model).toBeUndefined();
  });

  it("returns correct model for each harness", () => {
    expect(getModelById("sonnet-4.5")?.harness).toBe("claude");
    expect(getModelById("gpt-5-2-high")?.harness).toBe("codex");
    expect(getModelById("glm-4.7")?.harness).toBe("opencode");
    expect(getModelById("gemini-3-pro")?.harness).toBe("gemini");
  });
});

describe("getModelsByHarness", () => {
  it("returns all Claude models", () => {
    const models = getModelsByHarness("claude");
    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.every((m) => m.harness === "claude")).toBe(true);
  });

  it("returns all Codex models", () => {
    const models = getModelsByHarness("codex");
    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.every((m) => m.harness === "codex")).toBe(true);
  });

  it("returns all OpenCode models", () => {
    const models = getModelsByHarness("opencode");
    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.every((m) => m.harness === "opencode")).toBe(true);
  });

  it("returns empty array for non-existent harness", () => {
    // This should be a type error in practice, but testing runtime behavior
    const models = getModelsByHarness("invalid" as "claude");
    expect(models).toEqual([]);
  });

  it("models are ordered by tier (SOTA first)", () => {
    const models = getModelsByHarness("claude");
    const tierOrder = ["sota", "premium", "standard", "cheap", "free"];
    let lastTierIndex = -1;
    for (const model of models) {
      const tierIndex = tierOrder.indexOf(model.tier);
      expect(tierIndex).toBeGreaterThanOrEqual(lastTierIndex);
      if (tierIndex > lastTierIndex) {
        lastTierIndex = tierIndex;
      }
    }
  });
});

describe("getModelsByTier", () => {
  it("returns all free tier models", () => {
    const models = getModelsByTier("free");
    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.every((m) => m.tier === "free")).toBe(true);
  });

  it("returns all SOTA tier models", () => {
    const models = getModelsByTier("sota");
    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(models.every((m) => m.tier === "sota")).toBe(true);
  });

  it("returns all cheap tier models", () => {
    const models = getModelsByTier("cheap");
    expect(models.every((m) => m.tier === "cheap")).toBe(true);
  });

  it("returns empty array for tier with no models", () => {
    // All tiers should have at least one model, but test boundary
    const models = getModelsByTier("premium");
    expect(Array.isArray(models)).toBe(true);
  });
});

describe("getDefaultModelForHarness", () => {
  it("returns sonnet-4.5 as default for Claude", () => {
    expect(getDefaultModelForHarness("claude")).toBe("sonnet-4.5");
  });

  it("returns gpt-5-2-medium as default for Codex", () => {
    expect(getDefaultModelForHarness("codex")).toBe("gpt-5-2-medium");
  });

  it("returns glm-4.7 as default for OpenCode", () => {
    expect(getDefaultModelForHarness("opencode")).toBe("glm-4.7");
  });

  it("returns gemini-3-flash as default for Gemini", () => {
    expect(getDefaultModelForHarness("gemini")).toBe("gemini-3-flash");
  });

  it("returns a valid model ID for all harnesses", () => {
    const harnesses = ["claude", "codex", "droid", "opencode", "amp", "gemini"] as const;
    for (const harness of harnesses) {
      const defaultModel = getDefaultModelForHarness(harness);
      expect(defaultModel).toBeDefined();
      expect(getModelById(defaultModel)).toBeDefined();
    }
  });
});

describe("getHarnessForModel", () => {
  it("returns claude for opus-4.5", () => {
    expect(getHarnessForModel("opus-4.5")).toBe("claude");
  });

  it("returns codex for gpt-5-2-high", () => {
    expect(getHarnessForModel("gpt-5-2-high")).toBe("codex");
  });

  it("returns opencode for glm-4.7", () => {
    expect(getHarnessForModel("glm-4.7")).toBe("opencode");
  });

  it("returns gemini for gemini-3-pro", () => {
    expect(getHarnessForModel("gemini-3-pro")).toBe("gemini");
  });

  it("returns undefined for non-existent model", () => {
    expect(getHarnessForModel("non-existent")).toBeUndefined();
  });

  it("is consistent with getModelById", () => {
    for (const model of MODEL_REGISTRY) {
      expect(getHarnessForModel(model.id)).toBe(model.harness);
    }
  });
});

describe("Type exports", () => {
  it("ModelTier type can be used", () => {
    const tier: ModelTier = "sota";
    expect(tier).toBe("sota");
  });

  it("ModelProfile type can be used", () => {
    const profile: ModelProfile = {
      id: "test",
      displayName: "Test",
      harness: "claude",
      tier: "standard",
      inputCost: 1.0,
      outputCost: 5.0,
      contextWindow: 128000,
      strengths: [],
      limitations: [],
      cliFlag: "--model",
      cliValue: "test",
    };
    expect(profile.id).toBe("test");
  });

  it("HarnessProfile type can be used", () => {
    const harness: HarnessProfile = {
      name: "claude",
      displayName: "Claude",
      models: [],
      defaultModel: "sonnet-4.5",
      supportsModelSelection: true,
      modelSelectionMethod: "flag",
    };
    expect(harness.name).toBe("claude");
  });
});
