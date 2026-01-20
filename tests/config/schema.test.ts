/**
 * Configuration Schema Tests for Auto Mode
 *
 * Tests for US-001: Configuration Schema Extensions for Auto Mode
 * Following TDD: Tests written first, implementation comes after.
 */

import { describe, it, expect, beforeEach } from "bun:test";

describe("Auto Mode Configuration Schema", () => {
  describe("ModeSchema", () => {
    let ModeSchema: typeof import("../../src/config/schema").ModeSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      ModeSchema = module.ModeSchema;
    });

    it("should validate 'free' mode", () => {
      expect(ModeSchema.parse("free")).toBe("free");
    });

    it("should validate 'cheap' mode", () => {
      expect(ModeSchema.parse("cheap")).toBe("cheap");
    });

    it("should validate 'good' mode", () => {
      expect(ModeSchema.parse("good")).toBe("good");
    });

    it("should validate 'genius' mode", () => {
      expect(ModeSchema.parse("genius")).toBe("genius");
    });

    it("should reject invalid modes", () => {
      expect(() => ModeSchema.parse("invalid")).toThrow();
      expect(() => ModeSchema.parse("premium")).toThrow();
      expect(() => ModeSchema.parse("")).toThrow();
    });
  });

  describe("ComplexitySchema", () => {
    let ComplexitySchema: typeof import("../../src/config/schema").ComplexitySchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      ComplexitySchema = module.ComplexitySchema;
    });

    it("should validate 'simple' complexity", () => {
      expect(ComplexitySchema.parse("simple")).toBe("simple");
    });

    it("should validate 'medium' complexity", () => {
      expect(ComplexitySchema.parse("medium")).toBe("medium");
    });

    it("should validate 'complex' complexity", () => {
      expect(ComplexitySchema.parse("complex")).toBe("complex");
    });

    it("should validate 'expert' complexity", () => {
      expect(ComplexitySchema.parse("expert")).toBe("expert");
    });

    it("should reject invalid complexity levels", () => {
      expect(() => ComplexitySchema.parse("easy")).toThrow();
      expect(() => ComplexitySchema.parse("hard")).toThrow();
      expect(() => ComplexitySchema.parse("")).toThrow();
    });
  });

  describe("HarnessNameSchema", () => {
    let HarnessNameSchema: typeof import("../../src/config/schema").HarnessNameSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      HarnessNameSchema = module.HarnessNameSchema;
    });

    it("should validate 'claude' harness", () => {
      expect(HarnessNameSchema.parse("claude")).toBe("claude");
    });

    it("should validate 'codex' harness", () => {
      expect(HarnessNameSchema.parse("codex")).toBe("codex");
    });

    it("should validate 'droid' harness", () => {
      expect(HarnessNameSchema.parse("droid")).toBe("droid");
    });

    it("should validate 'opencode' harness", () => {
      expect(HarnessNameSchema.parse("opencode")).toBe("opencode");
    });

    it("should validate 'amp' harness", () => {
      expect(HarnessNameSchema.parse("amp")).toBe("amp");
    });

    it("should validate 'gemini' harness", () => {
      expect(HarnessNameSchema.parse("gemini")).toBe("gemini");
    });

    it("should reject invalid harness names", () => {
      expect(() => HarnessNameSchema.parse("cursor")).toThrow();
      expect(() => HarnessNameSchema.parse("copilot")).toThrow();
      expect(() => HarnessNameSchema.parse("")).toThrow();
    });
  });

  describe("ModeModelsSchema", () => {
    let ModeModelsSchema: typeof import("../../src/config/schema").ModeModelsSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      ModeModelsSchema = module.ModeModelsSchema;
    });

    it("should validate complete mode models config", () => {
      const config = {
        simple: "haiku-4.5",
        medium: "sonnet-4.5",
        complex: "opus-4.5",
        expert: "opus-4.5",
      };
      const result = ModeModelsSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.simple).toBe("haiku-4.5");
        expect(result.data.medium).toBe("sonnet-4.5");
        expect(result.data.complex).toBe("opus-4.5");
        expect(result.data.expert).toBe("opus-4.5");
      }
    });

    it("should reject config missing required fields", () => {
      const config = {
        simple: "haiku-4.5",
        // missing medium, complex, expert
      };
      const result = ModeModelsSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject config with non-string model values", () => {
      const config = {
        simple: 123,
        medium: "sonnet-4.5",
        complex: "opus-4.5",
        expert: "opus-4.5",
      };
      const result = ModeModelsSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("ReviewTaskSchema", () => {
    let ReviewTaskSchema: typeof import("../../src/config/schema").ReviewTaskSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      ReviewTaskSchema = module.ReviewTaskSchema;
    });

    it("should validate 'typecheck' review task", () => {
      expect(ReviewTaskSchema.parse("typecheck")).toBe("typecheck");
    });

    it("should validate 'lint' review task", () => {
      expect(ReviewTaskSchema.parse("lint")).toBe("lint");
    });

    it("should validate 'test' review task", () => {
      expect(ReviewTaskSchema.parse("test")).toBe("test");
    });

    it("should validate 'security' review task", () => {
      expect(ReviewTaskSchema.parse("security")).toBe("security");
    });

    it("should validate 'quality' review task", () => {
      expect(ReviewTaskSchema.parse("quality")).toBe("quality");
    });

    it("should validate 'docs' review task", () => {
      expect(ReviewTaskSchema.parse("docs")).toBe("docs");
    });

    it("should reject invalid review tasks", () => {
      expect(() => ReviewTaskSchema.parse("build")).toThrow();
      expect(() => ReviewTaskSchema.parse("deploy")).toThrow();
      expect(() => ReviewTaskSchema.parse("")).toThrow();
    });
  });

  describe("ReviewConfigSchema", () => {
    let ReviewConfigSchema: typeof import("../../src/config/schema").ReviewConfigSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      ReviewConfigSchema = module.ReviewConfigSchema;
    });

    it("should validate complete review config", () => {
      const config = {
        promptUser: true,
        defaultMode: "good",
        microTasks: ["typecheck", "lint", "test"],
        maxRetries: 3,
      };
      const result = ReviewConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.promptUser).toBe(true);
        expect(result.data.defaultMode).toBe("good");
        expect(result.data.microTasks).toContain("typecheck");
        expect(result.data.maxRetries).toBe(3);
      }
    });

    it("should reject maxRetries below 1", () => {
      const config = {
        promptUser: true,
        defaultMode: "good",
        microTasks: ["typecheck"],
        maxRetries: 0,
      };
      const result = ReviewConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject maxRetries above 5", () => {
      const config = {
        promptUser: true,
        defaultMode: "good",
        microTasks: ["typecheck"],
        maxRetries: 10,
      };
      const result = ReviewConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject invalid microTasks values", () => {
      const config = {
        promptUser: true,
        defaultMode: "good",
        microTasks: ["typecheck", "invalid_task"],
        maxRetries: 3,
      };
      const result = ReviewConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject invalid defaultMode", () => {
      const config = {
        promptUser: true,
        defaultMode: "invalid_mode",
        microTasks: ["typecheck"],
        maxRetries: 3,
      };
      const result = ReviewConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should use default values when fields are omitted", () => {
      const config = {};
      const result = ReviewConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.promptUser).toBeDefined();
        expect(result.data.defaultMode).toBeDefined();
        expect(result.data.microTasks).toBeDefined();
        expect(result.data.maxRetries).toBeDefined();
      }
    });
  });

  describe("EscalationConfigSchema", () => {
    let EscalationConfigSchema: typeof import("../../src/config/schema").EscalationConfigSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      EscalationConfigSchema = module.EscalationConfigSchema;
    });

    it("should validate complete escalation config", () => {
      const config = {
        enabled: true,
        maxAttempts: 3,
        escalationPath: {
          "haiku-4.5": "sonnet-4.5",
          "sonnet-4.5": "opus-4.5",
        },
      };
      const result = EscalationConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.maxAttempts).toBe(3);
        expect(result.data.escalationPath["haiku-4.5"]).toBe("sonnet-4.5");
      }
    });

    it("should reject maxAttempts below 1", () => {
      const config = {
        enabled: true,
        maxAttempts: 0,
        escalationPath: {},
      };
      const result = EscalationConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject maxAttempts above 5", () => {
      const config = {
        enabled: true,
        maxAttempts: 10,
        escalationPath: {},
      };
      const result = EscalationConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should use default values when fields are omitted", () => {
      const config = {};
      const result = EscalationConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBeDefined();
        expect(result.data.maxAttempts).toBeDefined();
        expect(result.data.escalationPath).toBeDefined();
      }
    });
  });

  describe("AutoModeConfigSchema", () => {
    let AutoModeConfigSchema: typeof import("../../src/config/schema").AutoModeConfigSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      AutoModeConfigSchema = module.AutoModeConfigSchema;
    });

    it("should validate complete auto mode config", () => {
      const config = {
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
      };
      const result = AutoModeConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.defaultMode).toBe("good");
        expect(result.data.fallbackOrder).toContain("claude");
      }
    });

    it("should reject invalid fallbackOrder harness names", () => {
      const config = {
        enabled: true,
        defaultMode: "good",
        fallbackOrder: ["claude", "invalid_harness"],
        modeModels: {
          simple: "haiku-4.5",
          medium: "sonnet-4.5",
          complex: "opus-4.5",
          expert: "opus-4.5",
        },
      };
      const result = AutoModeConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject invalid defaultMode", () => {
      const config = {
        enabled: true,
        defaultMode: "invalid_mode",
        fallbackOrder: ["claude"],
        modeModels: {
          simple: "haiku-4.5",
          medium: "sonnet-4.5",
          complex: "opus-4.5",
          expert: "opus-4.5",
        },
      };
      const result = AutoModeConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should use default values when fields are omitted", () => {
      const config = {};
      const result = AutoModeConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBeDefined();
        expect(result.data.defaultMode).toBeDefined();
        expect(result.data.fallbackOrder).toBeDefined();
        expect(result.data.modeModels).toBeDefined();
        expect(result.data.review).toBeDefined();
        expect(result.data.escalation).toBeDefined();
      }
    });
  });

  describe("RelentlessConfigSchema with autoMode", () => {
    let RelentlessConfigSchema: typeof import("../../src/config/schema").RelentlessConfigSchema;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      RelentlessConfigSchema = module.RelentlessConfigSchema;
    });

    it("should include autoMode property", () => {
      const config = {
        defaultAgent: "auto",
        autoMode: {
          enabled: true,
          defaultMode: "good",
        },
      };
      const result = RelentlessConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.autoMode).toBeDefined();
        expect(result.data.autoMode.enabled).toBe(true);
      }
    });

    it("should use default autoMode when not provided", () => {
      const config = {
        defaultAgent: "auto",
      };
      const result = RelentlessConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.autoMode).toBeDefined();
      }
    });
  });

  describe("DEFAULT_CONFIG", () => {
    let DEFAULT_CONFIG: typeof import("../../src/config/schema").DEFAULT_CONFIG;

    beforeEach(async () => {
      const module = await import("../../src/config/schema");
      DEFAULT_CONFIG = module.DEFAULT_CONFIG;
    });

    it("should include autoMode in default config", () => {
      expect(DEFAULT_CONFIG.autoMode).toBeDefined();
    });

    it("should have enabled set to false by default (new feature)", () => {
      expect(DEFAULT_CONFIG.autoMode.enabled).toBe(false);
    });

    it("should have 'good' as the default mode", () => {
      expect(DEFAULT_CONFIG.autoMode.defaultMode).toBe("good");
    });

    it("should have default fallback order", () => {
      expect(DEFAULT_CONFIG.autoMode.fallbackOrder).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.fallbackOrder).toContain("claude");
    });

    it("should have default modeModels config", () => {
      expect(DEFAULT_CONFIG.autoMode.modeModels).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.modeModels.simple).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.modeModels.medium).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.modeModels.complex).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.modeModels.expert).toBeDefined();
    });

    it("should have default review config", () => {
      expect(DEFAULT_CONFIG.autoMode.review).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.review.microTasks).toBeDefined();
    });

    it("should have default escalation config", () => {
      expect(DEFAULT_CONFIG.autoMode.escalation).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.escalation.enabled).toBeDefined();
      expect(DEFAULT_CONFIG.autoMode.escalation.maxAttempts).toBeDefined();
    });
  });

  describe("TypeScript Type Exports", () => {
    it("should export Mode type", async () => {
      const module = await import("../../src/config/schema");
      // This test verifies the type exists (compilation test)
      const mode: typeof module.ModeSchema._type = "good";
      expect(mode).toBe("good");
    });

    it("should export Complexity type", async () => {
      const module = await import("../../src/config/schema");
      const complexity: typeof module.ComplexitySchema._type = "simple";
      expect(complexity).toBe("simple");
    });

    it("should export HarnessName type", async () => {
      const module = await import("../../src/config/schema");
      const harness: typeof module.HarnessNameSchema._type = "claude";
      expect(harness).toBe("claude");
    });

    it("should export ModeModels type", async () => {
      const module = await import("../../src/config/schema");
      const modeModels: typeof module.ModeModelsSchema._type = {
        simple: "test",
        medium: "test",
        complex: "test",
        expert: "test",
      };
      expect(modeModels.simple).toBe("test");
    });

    it("should export ReviewConfig type", async () => {
      const module = await import("../../src/config/schema");
      const review: typeof module.ReviewConfigSchema._type = {
        promptUser: true,
        defaultMode: "good",
        microTasks: ["typecheck"],
        maxRetries: 3,
      };
      expect(review.promptUser).toBe(true);
    });

    it("should export EscalationConfig type", async () => {
      const module = await import("../../src/config/schema");
      const escalation: typeof module.EscalationConfigSchema._type = {
        enabled: true,
        maxAttempts: 3,
        escalationPath: {},
      };
      expect(escalation.enabled).toBe(true);
    });

    it("should export AutoModeConfig type", async () => {
      const module = await import("../../src/config/schema");
      const autoMode: typeof module.AutoModeConfigSchema._type = {
        enabled: true,
        defaultMode: "good",
        fallbackOrder: ["claude"],
        modeModels: {
          simple: "test",
          medium: "test",
          complex: "test",
          expert: "test",
        },
        review: {
          promptUser: true,
          defaultMode: "good",
          microTasks: ["typecheck"],
          maxRetries: 3,
        },
        escalation: {
          enabled: true,
          maxAttempts: 3,
          escalationPath: {},
        },
      };
      expect(autoMode.enabled).toBe(true);
    });
  });
});
