/**
 * Configuration Loader
 *
 * Loads and validates relentless/config.json
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { RelentlessConfigSchema, DEFAULT_CONFIG, type RelentlessConfig } from "./schema";

const CONFIG_FILENAME = "config.json";
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
    return DEFAULT_CONFIG;
  }

  try {
    const content = await Bun.file(path).text();
    const json = JSON.parse(content);
    const validated = RelentlessConfigSchema.parse(json);
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
