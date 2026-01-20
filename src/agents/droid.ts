/**
 * Droid Agent Adapter
 *
 * Adapter for Factory's Droid CLI.
 * https://factory.ai
 *
 * ## Model Selection
 *
 * Droid supports model selection via the `-m` flag (short form).
 * Pass the model name in the `options.model` parameter.
 *
 * **Supported models:**
 * - `claude-opus-4-5-20251101` - Claude Opus 4.5
 * - `claude-sonnet-4-5-20250929` - Claude Sonnet 4.5
 * - `claude-haiku-4-5-20251001` - Claude Haiku 4.5
 * - `gpt-5.2` - GPT-5.2
 * - `gpt-5.1` - GPT-5.1
 * - `gpt-5.1-codex` - GPT-5.1 Codex
 * - `gpt-5.1-codex-max` - GPT-5.1 Codex Max
 * - `gemini-3-pro-preview` - Gemini 3 Pro Preview
 *
 * **CLI command format:**
 * ```
 * droid exec -m <model> --reasoning-effort <level> --auto high
 * ```
 *
 * @example
 * ```typescript
 * const result = await droidAdapter.invoke("Fix the bug", {
 *   model: "gpt-5.2",
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";
import { getModelById } from "../routing/registry";
import { runCommand } from "./exec";

export const droidAdapter: AgentAdapter = {
  name: "droid",
  displayName: "Factory Droid",
  hasSkillSupport: true,
  skillInstallCommand: "droid skill install <skill-name>",

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
      const proc = Bun.spawn(["which", "droid"], { stdout: "pipe" });
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
    // Build command args: droid exec [-m <model>] --auto high
    const args = ["exec"];

    if (options?.model) {
      const modelProfile = getModelById(options.model);
      const modelValue =
        modelProfile?.harness === "droid" ? modelProfile.cliValue : options.model;
      args.push("-m", modelValue);
      if (modelProfile?.harness === "droid" && modelProfile.cliArgs) {
        args.push(...modelProfile.cliArgs);
      }
    }

    // Use --auto high for high risk tolerance by default
    args.push("--auto", "high");

    const result = await runCommand(["droid", ...args], {
      cwd: options?.workingDirectory,
      stdin: new Blob([prompt]),
      timeoutMs: options?.timeout,
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
    if (output.includes("[Relentless] Idle timeout")) {
      return {
        limited: true,
        message: "Droid idle timeout",
      };
    }

    if (/mcp start failed/i.test(output) || /error reloading mcp servers/i.test(output)) {
      return {
        limited: true,
        message: "Droid unavailable due to MCP initialization failure",
      };
    }

    // Droid rate limit patterns
    const patterns = [
      /rate limit/i,
      /\b429\b/,
      /too many requests/i,
      /quota exceeded/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(output)) {
        return {
          limited: true,
          message: "Factory Droid rate limit exceeded",
        };
      }
    }

    return { limited: false };
  },

  async installSkills(projectPath: string): Promise<void> {
    // Factory uses .factory/skills/ for skills (PLURAL)
    const skillsDir = `${projectPath}/.factory/skills`;
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
