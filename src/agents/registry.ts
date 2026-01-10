/**
 * Agent Registry
 *
 * Central registry for all supported AI coding agents.
 * Provides agent discovery, selection, and health checks.
 */

import type { AgentAdapter, AgentName } from "./types";
import { claudeAdapter } from "./claude";
import { ampAdapter } from "./amp";
import { opencodeAdapter } from "./opencode";
import { codexAdapter } from "./codex";
import { droidAdapter } from "./droid";
import { geminiAdapter } from "./gemini";

/**
 * Map of all registered agent adapters
 */
export const AGENTS: Record<AgentName, AgentAdapter> = {
  claude: claudeAdapter,
  amp: ampAdapter,
  opencode: opencodeAdapter,
  codex: codexAdapter,
  droid: droidAdapter,
  gemini: geminiAdapter,
};

/**
 * Get an agent adapter by name
 */
export function getAgent(name: AgentName): AgentAdapter {
  const agent = AGENTS[name];
  if (!agent) {
    throw new Error(`Unknown agent: ${name}`);
  }
  return agent;
}

/**
 * Get all agent names
 */
export function getAllAgentNames(): AgentName[] {
  return Object.keys(AGENTS) as AgentName[];
}

/**
 * Check which agents are installed on the system
 */
export async function getInstalledAgents(): Promise<AgentAdapter[]> {
  const results = await Promise.all(
    Object.values(AGENTS).map(async (agent) => ({
      agent,
      installed: await agent.isInstalled(),
    }))
  );

  return results.filter((r) => r.installed).map((r) => r.agent);
}

/**
 * Agent health check result
 */
export interface AgentHealthResult {
  name: AgentName;
  displayName: string;
  installed: boolean;
  executablePath: string | null;
  hasSkillSupport: boolean;
  skillInstallCommand?: string;
}

/**
 * Run health checks on all agents
 */
export async function checkAgentHealth(): Promise<AgentHealthResult[]> {
  const results = await Promise.all(
    Object.values(AGENTS).map(async (agent) => ({
      name: agent.name,
      displayName: agent.displayName,
      installed: await agent.isInstalled(),
      executablePath: await agent.getExecutablePath(),
      hasSkillSupport: agent.hasSkillSupport,
      skillInstallCommand: agent.skillInstallCommand,
    }))
  );

  return results;
}

/**
 * Validate that an agent name is valid
 */
export function isValidAgentName(name: string): name is AgentName {
  return name in AGENTS;
}
