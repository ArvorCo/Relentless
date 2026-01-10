/**
 * Configuration Loader
 *
 * Loads and validates relentless.config.json
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { RelentlessConfigSchema, DEFAULT_CONFIG, type RelentlessConfig } from "./schema";

const CONFIG_FILENAME = "relentless.config.json";

/**
 * Find the config file in the current or parent directories
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let dir = startDir;

  while (dir !== "/") {
    const configPath = join(dir, CONFIG_FILENAME);
    if (existsSync(configPath)) {
      return configPath;
    }
    dir = join(dir, "..");
  }

  return null;
}

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<RelentlessConfig> {
  const path = configPath ?? findConfigFile();

  if (!path) {
    console.warn(`No ${CONFIG_FILENAME} found, using defaults`);
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
  path: string = join(process.cwd(), CONFIG_FILENAME)
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
  const path = join(dir, CONFIG_FILENAME);
  await saveConfig(DEFAULT_CONFIG, path);
  return path;
}
