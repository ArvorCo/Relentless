/**
 * Amp Agent Adapter
 *
 * Adapter for Sourcegraph's Amp CLI with model/mode selection support.
 * https://ampcode.com
 *
 * ## Supported Modes
 * - `free` - Free tier mode ($10/day grant, may have rate limits)
 * - `smart` - Smart mode (uses Amp's intelligent model selection)
 *
 * ## Model Selection Method
 * Amp uses the `-m`/`--mode` CLI flag for mode selection.
 * Amp uses `-x`/`--execute` to run a single prompt non-interactively.
 *
 * ## Usage Example
 * ```typescript
 * const result = await ampAdapter.invoke("Fix the bug", {
 *   model: "free",  // Uses -m free
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 *
 * @module agents/amp
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";
import { getModelById } from "../routing/registry";
import { runCommand } from "./exec";

export const ampAdapter: AgentAdapter = {
  name: "amp",
  displayName: "Amp",
  hasSkillSupport: true,
  skillInstallCommand: "amp skill add github.com/ArvorCo/Relentless",

  async isInstalled(): Promise<boolean> {
    try {
      const path = await this.getExecutablePath();
      return path !== null;
    } catch {
      return false;
    }
  },

  async getExecutablePath(): Promise<string | null> {
    try {
      const proc = Bun.spawn(["which", "amp"], { stdout: "pipe" });
      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      if (exitCode === 0 && output.trim()) {
        return output.trim();
      }
      return null;
    } catch {
      return null;
    }
  },

  async invoke(prompt: string, options?: InvokeOptions): Promise<AgentResult> {
    const args: string[] = [];

    if (options?.dangerouslyAllowAll) {
      args.push("--dangerously-allow-all");
    }

    // Add mode flag if model is provided
    if (options?.model) {
      const modelProfile = getModelById(options.model);
      const modeValue =
        modelProfile?.harness === "amp" ? modelProfile.cliValue : options.model;
      const modeFlag =
        modelProfile?.harness === "amp" ? modelProfile.cliFlag : "-m";
      args.push(modeFlag, modeValue);
    }

    // Execute single prompt in non-interactive mode
    args.push("-x");

    const result = await runCommand(["amp", ...args], {
      cwd: options?.workingDirectory,
      stdin: new Blob([prompt]),
      timeoutMs: options?.timeout,
      signal: options?.signal,
    });

    const timeoutNote =
      result.timedOut && options?.timeout
        ? `\n[Relentless] Idle timeout after ${options.timeout}ms.`
        : "";
    const output = result.stdout + (result.stderr ? `\n${result.stderr}` : "") + timeoutNote;
    const duration = result.duration;

    return {
      output,
      exitCode: result.exitCode,
      isComplete: this.detectCompletion(output),
      duration,
    };
  },

  detectCompletion(output: string): boolean {
    return output.includes("<promise>COMPLETE</promise>");
  },

  detectRateLimit(output: string): RateLimitInfo {
    // NOTE: Idle timeout is NOT a rate limit - it just means the agent stopped
    // producing output for a while, which is normal behavior for complex tasks.

    // Amp rate limit patterns
    const patterns = [
      /quota exceeded/i,
      /limit reached/i,
      /rate limit/i,
      /too many requests/i,
      /execute mode is not permitted/i,
      /unexpected error inside amp cli/i,
      /amp threads share --support/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(output)) {
        return {
          limited: true,
          message: "Amp rate limit exceeded",
        };
      }
    }

    return { limited: false };
  },

  async installSkills(projectPath: string): Promise<void> {
    // Amp can install skills globally via amp skill add
    // For project-local, we copy to the project's .amp/skills/
    const skillsDir = `${projectPath}/.amp/skills`;
    await Bun.spawn(["mkdir", "-p", skillsDir]).exited;

    const relentlessRoot = import.meta.dir.replace("/src/agents", "");
    const sourceSkillsDir = `${relentlessRoot}/.claude/skills`;

    // Copy all skills
    const skills = [
      "prd",
      "relentless",
      "constitution",
      "specify",
      "plan",
      "tasks",
      "checklist",
      "clarify",
      "analyze",
      "implement",
      "taskstoissues",
    ];

    for (const skill of skills) {
      await Bun.spawn([
        "cp",
        "-r",
        `${sourceSkillsDir}/${skill}`,
        `${skillsDir}/`,
      ]).exited;
    }
  },
};
