/**
 * Codex Agent Adapter
 *
 * Adapter for OpenAI's Codex CLI.
 * https://developers.openai.com/codex/cli/
 *
 * ## Model Selection
 *
 * Codex supports model selection via the `--model` flag.
 * Pass the model name in the `options.model` parameter.
 *
 * **Supported models (GPT-5.2 reasoning tiers):**
 * - `gpt-5.2-xhigh` - reasoning-effort xhigh (~$1.75/$14 per MTok)
 * - `gpt-5.2-high` - reasoning-effort high (~$1.75/$14 per MTok)
 * - `gpt-5.2-medium` - reasoning-effort medium (~$1.25/$10 per MTok)
 * - `gpt-5.2-low` - reasoning-effort low (~$0.75/$6 per MTok)
 *
 * These IDs map to `--model gpt-5.2 -c reasoning_effort="<tier>"` in the CLI.
 *
 * **CLI command format:**
 * ```
 * codex exec --model gpt-5.2 -c reasoning_effort="<low|medium|high|xhigh>" -
 * ```
 *
 * @example
 * ```typescript
 * const result = await codexAdapter.invoke("Fix the bug", {
 *   model: "gpt-5.2-high",
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";
import { getModelById } from "../routing/registry";
import { runCommand } from "./exec";

export const codexAdapter: AgentAdapter = {
  name: "codex",
  displayName: "OpenAI Codex",
  hasSkillSupport: true,
  skillInstallCommand: "codex skill add <skill-name>",

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
      const proc = Bun.spawn(["which", "codex"], { stdout: "pipe" });
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
    const args = ["exec"];

    // Add model selection if specified
    if (options?.model) {
      const modelProfile = getModelById(options.model);
      if (modelProfile?.harness === "codex") {
        args.push(modelProfile.cliFlag, modelProfile.cliValue);
        if (modelProfile.cliArgs) {
          args.push(...modelProfile.cliArgs);
        }
      } else {
        args.push("--model", options.model);
      }
    }

    // Codex uses `-` to read from stdin
    args.push("-");

    const result = await runCommand(["codex", ...args], {
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

    if (
      /cannot access session files/i.test(output) ||
      /failed to create session/i.test(output) ||
      /(permission denied|operation not permitted).*\/\.codex\/sessions/i.test(output)
    ) {
      return {
        limited: true,
        message: "Codex unavailable due to session permissions",
      };
    }

    // Codex/OpenAI rate limit patterns
    const patterns = [
      /rate limit exceeded/i,
      /\b429\b/,
      /too many requests/i,
      /quota exceeded/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(output)) {
        return {
          limited: true,
          message: "OpenAI Codex rate limit exceeded",
        };
      }
    }

    return { limited: false };
  },

  async installSkills(projectPath: string): Promise<void> {
    // Codex uses .codex/skills/ for project-level skills
    const skillsDir = `${projectPath}/.codex/skills`;
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
