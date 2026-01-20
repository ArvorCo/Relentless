/**
 * Configuration Loader
 *
 * Loads and validates relentless/config.json and constitution.md
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { RelentlessConfigSchema, DEFAULT_CONFIG, type RelentlessConfig } from "./schema";

const CONFIG_FILENAME = "config.json";
const CONSTITUTION_FILENAME = "constitution.md";
const RELENTLESS_DIR = "relentless";

/**
 * Find the relentless directory in the current or parent directories
 */
export function findRelentlessDir(startDir: string = process.cwd()): string | null {
  let dir = startDir;

  while (dir !== "/") {
    const relentlessPath = join(dir, RELENTLESS_DIR);
    if (existsSync(relentlessPath)) {
      return relentlessPath;
    }
    dir = join(dir, "..");
  }

  return null;
}

/**
 * Find the config file in the relentless directory
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  const relentlessDir = findRelentlessDir(startDir);
  if (!relentlessDir) {
    return null;
  }

  const configPath = join(relentlessDir, CONFIG_FILENAME);
  if (existsSync(configPath)) {
    return configPath;
  }

  return null;
}

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<RelentlessConfig> {
  const path = configPath ?? findConfigFile();

  if (!path) {
    console.warn(`No relentless/${CONFIG_FILENAME} found, using defaults`);
    const config = { ...DEFAULT_CONFIG };
    const timeoutOverride = process.env.RELENTLESS_EXECUTION_TIMEOUT_MS;
    if (timeoutOverride) {
      const parsed = Number.parseInt(timeoutOverride, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        config.execution.timeout = parsed;
      }
    }
    return config;
  }

  try {
    const content = await Bun.file(path).text();
    const json = JSON.parse(content);
    const validated = RelentlessConfigSchema.parse(json);
    const timeoutOverride = process.env.RELENTLESS_EXECUTION_TIMEOUT_MS;
    if (timeoutOverride) {
      const parsed = Number.parseInt(timeoutOverride, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        validated.execution.timeout = parsed;
      }
    }
    return validated;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(
  config: RelentlessConfig,
  path: string = join(process.cwd(), RELENTLESS_DIR, CONFIG_FILENAME)
): Promise<void> {
  const validated = RelentlessConfigSchema.parse(config);
  const content = JSON.stringify(validated, null, 2);
  await Bun.write(path, content);
}

/**
 * Create a default configuration file
 */
export async function createDefaultConfig(
  dir: string = process.cwd()
): Promise<string> {
  const path = join(dir, RELENTLESS_DIR, CONFIG_FILENAME);
  await saveConfig(DEFAULT_CONFIG, path);
  return path;
}

/**
 * Find the constitution file in the relentless directory
 */
export function findConstitutionFile(startDir: string = process.cwd()): string | null {
  const relentlessDir = findRelentlessDir(startDir);
  if (!relentlessDir) {
    return null;
  }

  const constitutionPath = join(relentlessDir, CONSTITUTION_FILENAME);
  if (existsSync(constitutionPath)) {
    return constitutionPath;
  }

  return null;
}

/**
 * Constitution principle level
 */
export type PrincipleLevel = "MUST" | "SHOULD";

/**
 * Parsed constitution principle
 */
export interface Principle {
  level: PrincipleLevel;
  text: string;
  section: string;
}

/**
 * Parsed constitution
 */
export interface Constitution {
  raw: string;
  principles: Principle[];
  sections: string[];
}

/**
 * Parse constitution markdown to extract MUST/SHOULD principles
 */
export function parseConstitution(content: string): Constitution {
  const principles: Principle[] = [];
  const sections = new Set<string>();

  let currentSection = "";
  let currentLevel: PrincipleLevel | null = null;
  const lines = content.split("\n");

  for (const line of lines) {
    // Track current section
    if (line.startsWith("## ")) {
      currentSection = line.replace("## ", "").trim();
      sections.add(currentSection);
      currentLevel = null;
    } else if (line.startsWith("### ")) {
      currentSection = line.replace("### ", "").trim();
      sections.add(currentSection);
      currentLevel = null;
    }

    // Detect MUST/SHOULD headers (format: **MUST:** or **SHOULD:**)
    if (line.match(/^\*\*MUST:?\*\*:?\s*$/i)) {
      currentLevel = "MUST";
      continue;
    }
    if (line.match(/^\*\*SHOULD:?\*\*:?\s*$/i)) {
      currentLevel = "SHOULD";
      continue;
    }

    // Extract bullet points under current level
    if (currentLevel && line.match(/^-\s+.+/)) {
      const text = line.replace(/^-\s+/, "").trim();
      if (text) {
        principles.push({
          level: currentLevel,
          text,
          section: currentSection,
        });
      }
      continue;
    }

    // Extract inline MUST/SHOULD (format: **MUST** text or **SHOULD** text)
    const mustMatch = line.match(/\*\*MUST\*\*\s+(.+)/);
    if (mustMatch) {
      principles.push({
        level: "MUST",
        text: mustMatch[1].trim(),
        section: currentSection,
      });
    }

    const shouldMatch = line.match(/\*\*SHOULD\*\*\s+(.+)/);
    if (shouldMatch) {
      principles.push({
        level: "SHOULD",
        text: shouldMatch[1].trim(),
        section: currentSection,
      });
    }

    // Reset level on empty line or **Rationale** or other header
    if (line.trim() === "" || line.match(/^\*\*[^MS]/)) {
      currentLevel = null;
    }
  }

  return {
    raw: content,
    principles,
    sections: Array.from(sections),
  };
}

/**
 * Load constitution from file
 */
export async function loadConstitution(constitutionPath?: string): Promise<Constitution | null> {
  const path = constitutionPath ?? findConstitutionFile();

  if (!path || !existsSync(path)) {
    return null;
  }

  try {
    const content = await Bun.file(path).text();
    return parseConstitution(content);
  } catch (error) {
    console.warn(`Failed to load constitution: ${error}`);
    return null;
  }
}

/**
 * Validate constitution format
 */
export function validateConstitution(constitution: Constitution): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that we have at least some principles
  if (constitution.principles.length === 0) {
    errors.push("Constitution has no MUST or SHOULD principles defined");
  }

  // Check that we have both MUST and SHOULD principles
  const hasMust = constitution.principles.some(p => p.level === "MUST");
  const hasShould = constitution.principles.some(p => p.level === "SHOULD");

  if (!hasMust) {
    errors.push("Constitution has no MUST principles (required directives)");
  }

  if (!hasShould) {
    errors.push("Constitution has no SHOULD principles (recommended guidelines)");
  }

  // Check for empty principle text
  for (const principle of constitution.principles) {
    if (!principle.text || principle.text.trim().length === 0) {
      errors.push(`Empty ${principle.level} principle in section: ${principle.section}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
