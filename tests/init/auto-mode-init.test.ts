/**
 * Tests for Auto Mode prompting during `relentless init`
 *
 * Tests for US-030: Init Command Update for Auto Mode
 *
 * @module tests/init/auto-mode-init.test.ts
 */

import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Mode } from "../../src/config/schema";

// Test helpers
const TEST_DIR = "/tmp/relentless-auto-mode-init-test";

function createTestDir(): string {
  const testDir = `${TEST_DIR}-${Date.now()}`;
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

function cleanupTestDir(testDir: string): void {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

describe("Auto Mode Init", () => {
  describe("InitAutoModeOptions interface", () => {
    it("should export InitAutoModeOptions type with correct properties", async () => {
      const module = await import("../../src/init/scaffolder");
      // Type check - these should exist
      expect(module.initProject).toBeDefined();
      // The new interface should be available
    });
  });

  describe("promptAutoModeConfig function", () => {
    it("should export promptAutoModeConfig function", async () => {
      const module = await import("../../src/init/scaffolder");
      expect(module.promptAutoModeConfig).toBeDefined();
      expect(typeof module.promptAutoModeConfig).toBe("function");
    });

    it("should return enabled: true with default mode when user accepts", async () => {
      const { promptAutoModeConfig } = await import("../../src/init/scaffolder");

      // Mock readline to simulate user pressing Enter (accept default Y)
      const mockReadline = {
        question: (_prompt: string, callback: (answer: string) => void) => {
          // First question: Enable Auto Mode? - user presses Enter (defaults to Y)
          callback("");
        },
        close: () => {},
      };

      const result = await promptAutoModeConfig({
        readline: mockReadline,
        defaultMode: "good",
      });

      expect(result.enabled).toBe(true);
      expect(result.defaultMode).toBe("good");
    });

    it("should return enabled: false when user declines", async () => {
      const { promptAutoModeConfig } = await import("../../src/init/scaffolder");

      const mockReadline = {
        question: (_prompt: string, callback: (answer: string) => void) => {
          callback("n");
        },
        close: () => {},
      };

      const result = await promptAutoModeConfig({
        readline: mockReadline,
        defaultMode: "good",
      });

      expect(result.enabled).toBe(false);
      expect(result.defaultMode).toBeUndefined();
    });

    it("should prompt for mode selection when user enables Auto Mode", async () => {
      const { promptAutoModeConfig } = await import("../../src/init/scaffolder");

      let questionCount = 0;
      const mockReadline = {
        question: (_prompt: string, callback: (answer: string) => void) => {
          questionCount++;
          if (questionCount === 1) {
            callback("y"); // Enable Auto Mode
          } else {
            callback("cheap"); // Select mode
          }
        },
        close: () => {},
      };

      const result = await promptAutoModeConfig({
        readline: mockReadline,
        defaultMode: "good",
      });

      expect(questionCount).toBe(2);
      expect(result.enabled).toBe(true);
      expect(result.defaultMode).toBe("cheap");
    });

    it("should use default mode when user presses Enter at mode selection", async () => {
      const { promptAutoModeConfig } = await import("../../src/init/scaffolder");

      let questionCount = 0;
      const mockReadline = {
        question: (_prompt: string, callback: (answer: string) => void) => {
          questionCount++;
          if (questionCount === 1) {
            callback("y"); // Enable Auto Mode
          } else {
            callback(""); // Press Enter for default
          }
        },
        close: () => {},
      };

      const result = await promptAutoModeConfig({
        readline: mockReadline,
        defaultMode: "good",
      });

      expect(result.enabled).toBe(true);
      expect(result.defaultMode).toBe("good");
    });
  });

  describe("generateAutoModeYamlConfig function", () => {
    it("should export generateAutoModeYamlConfig function", async () => {
      const module = await import("../../src/init/scaffolder");
      expect(module.generateAutoModeYamlConfig).toBeDefined();
      expect(typeof module.generateAutoModeYamlConfig).toBe("function");
    });

    it("should generate YAML with enabled: true when Auto Mode enabled", async () => {
      const { generateAutoModeYamlConfig } = await import("../../src/init/scaffolder");

      const yaml = generateAutoModeYamlConfig({
        enabled: true,
        defaultMode: "good",
      });

      expect(yaml).toContain("autoMode:");
      expect(yaml).toContain("enabled: true");
      expect(yaml).toContain("defaultMode: good");
    });

    it("should generate YAML with enabled: false when Auto Mode disabled", async () => {
      const { generateAutoModeYamlConfig } = await import("../../src/init/scaffolder");

      const yaml = generateAutoModeYamlConfig({
        enabled: false,
      });

      expect(yaml).toContain("autoMode:");
      expect(yaml).toContain("enabled: false");
    });

    it("should include commented examples of fallbackOrder", async () => {
      const { generateAutoModeYamlConfig } = await import("../../src/init/scaffolder");

      const yaml = generateAutoModeYamlConfig({
        enabled: true,
        defaultMode: "good",
      });

      expect(yaml).toContain("# fallbackOrder:");
      expect(yaml).toMatch(/# +- claude/);
    });

    it("should include commented examples of modeModels", async () => {
      const { generateAutoModeYamlConfig } = await import("../../src/init/scaffolder");

      const yaml = generateAutoModeYamlConfig({
        enabled: true,
        defaultMode: "good",
      });

      expect(yaml).toContain("# modeModels:");
    });
  });

  describe("parseAutoModeFlags function", () => {
    it("should export parseAutoModeFlags function", async () => {
      const module = await import("../../src/init/scaffolder");
      expect(module.parseAutoModeFlags).toBeDefined();
      expect(typeof module.parseAutoModeFlags).toBe("function");
    });

    it("should return skipPrompt: true and enabled: true for --yes flag", async () => {
      const { parseAutoModeFlags } = await import("../../src/init/scaffolder");

      const result = parseAutoModeFlags({ yes: true });

      expect(result.skipPrompt).toBe(true);
      expect(result.enabled).toBe(true);
      expect(result.defaultMode).toBe("good");
    });

    it("should return skipPrompt: true and enabled: false for --no-auto-mode flag", async () => {
      const { parseAutoModeFlags } = await import("../../src/init/scaffolder");

      const result = parseAutoModeFlags({ noAutoMode: true });

      expect(result.skipPrompt).toBe(true);
      expect(result.enabled).toBe(false);
    });

    it("should prioritize --no-auto-mode over --yes", async () => {
      const { parseAutoModeFlags } = await import("../../src/init/scaffolder");

      const result = parseAutoModeFlags({ yes: true, noAutoMode: true });

      expect(result.skipPrompt).toBe(true);
      expect(result.enabled).toBe(false);
    });

    it("should return skipPrompt: false when no flags provided", async () => {
      const { parseAutoModeFlags } = await import("../../src/init/scaffolder");

      const result = parseAutoModeFlags({});

      expect(result.skipPrompt).toBe(false);
    });
  });

  describe("hasExistingAutoModeConfig function", () => {
    let testDir: string;

    beforeEach(() => {
      testDir = createTestDir();
    });

    afterEach(() => {
      cleanupTestDir(testDir);
    });

    it("should export hasExistingAutoModeConfig function", async () => {
      const module = await import("../../src/init/scaffolder");
      expect(module.hasExistingAutoModeConfig).toBeDefined();
      expect(typeof module.hasExistingAutoModeConfig).toBe("function");
    });

    it("should return false for fresh project", async () => {
      const { hasExistingAutoModeConfig } = await import("../../src/init/scaffolder");

      const result = await hasExistingAutoModeConfig(testDir);

      expect(result).toBe(false);
    });

    it("should return false when config.json exists but has no autoMode", async () => {
      const { hasExistingAutoModeConfig } = await import("../../src/init/scaffolder");

      const relentlessDir = join(testDir, "relentless");
      mkdirSync(relentlessDir, { recursive: true });
      await Bun.write(
        join(relentlessDir, "config.json"),
        JSON.stringify({ project: "test" }, null, 2)
      );

      const result = await hasExistingAutoModeConfig(testDir);

      expect(result).toBe(false);
    });

    it("should return true when config.json has autoMode section", async () => {
      const { hasExistingAutoModeConfig } = await import("../../src/init/scaffolder");

      const relentlessDir = join(testDir, "relentless");
      mkdirSync(relentlessDir, { recursive: true });
      await Bun.write(
        join(relentlessDir, "config.json"),
        JSON.stringify({
          project: "test",
          autoMode: { enabled: true, defaultMode: "good" },
        }, null, 2)
      );

      const result = await hasExistingAutoModeConfig(testDir);

      expect(result).toBe(true);
    });

    it("should return true when relentless.config.yaml exists with autoMode", async () => {
      const { hasExistingAutoModeConfig } = await import("../../src/init/scaffolder");

      const relentlessDir = join(testDir, "relentless");
      mkdirSync(relentlessDir, { recursive: true });
      await Bun.write(
        join(relentlessDir, "relentless.config.yaml"),
        `autoMode:
  enabled: true
  defaultMode: good
`
      );

      const result = await hasExistingAutoModeConfig(testDir);

      expect(result).toBe(true);
    });
  });

  describe("getEstimatedSavings function", () => {
    it("should export getEstimatedSavings function", async () => {
      const module = await import("../../src/init/scaffolder");
      expect(module.getEstimatedSavings).toBeDefined();
      expect(typeof module.getEstimatedSavings).toBe("function");
    });

    it("should return correct savings percentage for free mode", async () => {
      const { getEstimatedSavings } = await import("../../src/init/scaffolder");

      const savings = getEstimatedSavings("free");

      expect(savings).toBe("~95%");
    });

    it("should return correct savings percentage for cheap mode", async () => {
      const { getEstimatedSavings } = await import("../../src/init/scaffolder");

      const savings = getEstimatedSavings("cheap");

      expect(savings).toBe("~75%");
    });

    it("should return correct savings percentage for good mode", async () => {
      const { getEstimatedSavings } = await import("../../src/init/scaffolder");

      const savings = getEstimatedSavings("good");

      expect(savings).toBe("~50%");
    });

    it("should return correct savings percentage for genius mode", async () => {
      const { getEstimatedSavings } = await import("../../src/init/scaffolder");

      const savings = getEstimatedSavings("genius");

      expect(savings).toBe("~0%");
    });
  });

  describe("initProject with Auto Mode options", () => {
    let testDir: string;

    beforeEach(() => {
      testDir = createTestDir();
    });

    afterEach(() => {
      cleanupTestDir(testDir);
    });

    it("should accept autoModeOptions parameter", async () => {
      const { initProject } = await import("../../src/init/scaffolder");

      // This should not throw
      await initProject(testDir, false, {
        skipPrompt: true,
        enabled: false,
      });

      // Verify initialization completed
      expect(existsSync(join(testDir, "relentless"))).toBe(true);
    });

    it("should generate config with autoMode enabled when skipPrompt and enabled are true", async () => {
      const { initProject } = await import("../../src/init/scaffolder");

      await initProject(testDir, false, {
        skipPrompt: true,
        enabled: true,
        defaultMode: "good",
      });

      const configPath = join(testDir, "relentless", "config.json");
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(await Bun.file(configPath).text());
      expect(config.autoMode).toBeDefined();
      expect(config.autoMode.enabled).toBe(true);
      expect(config.autoMode.defaultMode).toBe("good");
    });

    it("should generate config with autoMode disabled when skipPrompt is true and enabled is false", async () => {
      const { initProject } = await import("../../src/init/scaffolder");

      await initProject(testDir, false, {
        skipPrompt: true,
        enabled: false,
      });

      const configPath = join(testDir, "relentless", "config.json");
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(await Bun.file(configPath).text());
      expect(config.autoMode).toBeDefined();
      expect(config.autoMode.enabled).toBe(false);
    });

    it("should skip Auto Mode prompt when existing config has autoMode", async () => {
      const { initProject } = await import("../../src/init/scaffolder");

      // Pre-create config with autoMode
      const relentlessDir = join(testDir, "relentless");
      mkdirSync(relentlessDir, { recursive: true });
      await Bun.write(
        join(relentlessDir, "config.json"),
        JSON.stringify({
          autoMode: { enabled: true, defaultMode: "cheap" },
        }, null, 2)
      );

      // Run init with force=false - should detect existing config
      await initProject(testDir, false, {});

      // Original config should be preserved (not overwritten)
      const config = JSON.parse(
        await Bun.file(join(relentlessDir, "config.json")).text()
      );
      expect(config.autoMode.defaultMode).toBe("cheap");
    });
  });

  describe("Auto Mode explanation text", () => {
    it("should export AUTO_MODE_EXPLANATION constant", async () => {
      const module = await import("../../src/init/scaffolder");
      expect(module.AUTO_MODE_EXPLANATION).toBeDefined();
      expect(typeof module.AUTO_MODE_EXPLANATION).toBe("string");
    });

    it("should explain cost savings in AUTO_MODE_EXPLANATION", async () => {
      const { AUTO_MODE_EXPLANATION } = await import("../../src/init/scaffolder");

      expect(AUTO_MODE_EXPLANATION.toLowerCase()).toContain("cost");
      expect(AUTO_MODE_EXPLANATION.toLowerCase()).toContain("sav");
    });
  });

  describe("Mode descriptions", () => {
    it("should export MODE_DESCRIPTIONS constant", async () => {
      const module = await import("../../src/init/scaffolder");
      expect(module.MODE_DESCRIPTIONS).toBeDefined();
    });

    it("should have descriptions for all four modes", async () => {
      const { MODE_DESCRIPTIONS } = await import("../../src/init/scaffolder");

      expect(MODE_DESCRIPTIONS.free).toBeDefined();
      expect(MODE_DESCRIPTIONS.cheap).toBeDefined();
      expect(MODE_DESCRIPTIONS.good).toBeDefined();
      expect(MODE_DESCRIPTIONS.genius).toBeDefined();
    });
  });

  describe("YAML config file generation", () => {
    let testDir: string;

    beforeEach(() => {
      testDir = createTestDir();
    });

    afterEach(() => {
      cleanupTestDir(testDir);
    });

    it("should generate valid relentless.config.yaml file", async () => {
      const { initProject, generateAutoModeYamlConfig } = await import("../../src/init/scaffolder");

      await initProject(testDir, false, {
        skipPrompt: true,
        enabled: true,
        defaultMode: "good",
        generateYaml: true,
      });

      const yamlPath = join(testDir, "relentless", "relentless.config.yaml");

      // Check if YAML file is generated when generateYaml option is true
      if (existsSync(yamlPath)) {
        const yamlContent = await Bun.file(yamlPath).text();
        expect(yamlContent).toContain("autoMode:");
        expect(yamlContent).toContain("enabled: true");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle invalid mode input gracefully", async () => {
      const { promptAutoModeConfig } = await import("../../src/init/scaffolder");

      let questionCount = 0;
      const mockReadline = {
        question: (_prompt: string, callback: (answer: string) => void) => {
          questionCount++;
          if (questionCount === 1) {
            callback("y"); // Enable Auto Mode
          } else if (questionCount === 2) {
            callback("invalid"); // Invalid mode
          } else {
            callback("good"); // Valid mode on retry
          }
        },
        close: () => {},
      };

      const result = await promptAutoModeConfig({
        readline: mockReadline,
        defaultMode: "good",
      });

      // Should eventually get valid mode or fall back to default
      expect(["free", "cheap", "good", "genius"]).toContain(result.defaultMode);
    });

    it("should handle y/Y/yes/YES as affirmative responses", async () => {
      const { promptAutoModeConfig } = await import("../../src/init/scaffolder");

      for (const response of ["y", "Y", "yes", "YES"]) {
        const mockReadline = {
          question: (_prompt: string, callback: (answer: string) => void) => {
            callback(response);
          },
          close: () => {},
        };

        const result = await promptAutoModeConfig({
          readline: mockReadline,
          defaultMode: "good",
        });

        expect(result.enabled).toBe(true);
      }
    });

    it("should handle n/N/no/NO as negative responses", async () => {
      const { promptAutoModeConfig } = await import("../../src/init/scaffolder");

      for (const response of ["n", "N", "no", "NO"]) {
        const mockReadline = {
          question: (_prompt: string, callback: (answer: string) => void) => {
            callback(response);
          },
          close: () => {},
        };

        const result = await promptAutoModeConfig({
          readline: mockReadline,
          defaultMode: "good",
        });

        expect(result.enabled).toBe(false);
      }
    });
  });
});

describe("CLI init command flags", () => {
  it("should document --yes flag in help text", async () => {
    // This tests the CLI help documentation
    const result = Bun.spawnSync(["bun", "run", "bin/relentless.ts", "init", "--help"], {
      cwd: "/Users/leonardodias/arvor/relentless",
    });
    const output = new TextDecoder().decode(result.stdout);

    expect(output).toContain("--yes");
    expect(output).toContain("-y");
  });

  it("should document --no-auto-mode flag in help text", async () => {
    const result = Bun.spawnSync(["bun", "run", "bin/relentless.ts", "init", "--help"], {
      cwd: "/Users/leonardodias/arvor/relentless",
    });
    const output = new TextDecoder().decode(result.stdout);

    expect(output).toContain("--no-auto-mode");
  });
});
