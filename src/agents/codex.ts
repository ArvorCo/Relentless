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
 * - `gpt-5-2-high` - High reasoning tier, best for complex tasks (~$1.75/$14 per MTok)
 * - `gpt-5-2-medium` - Balanced tier, good for most tasks (~$1.25/$10 per MTok)
 * - `gpt-5-2-low` - Fast tier, good for simple tasks (~$0.75/$6 per MTok)
 *
 * **CLI command format:**
 * ```
 * codex exec --model <model> -
 * ```
 *
 * @example
 * ```typescript
 * const result = await codexAdapter.invoke("Fix the bug", {
 *   model: "gpt-5-2-high",
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";

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
    const startTime = Date.now();
    const args = ["exec"];

    // Add model selection if specified
    if (options?.model) {
      args.push("--model", options.model);
    }

    // Codex uses `-` to read from stdin
    args.push("-");

    const proc = Bun.spawn(["codex", ...args], {
      cwd: options?.workingDirectory,
      stdin: new Blob([prompt]),
      stdout: "pipe",
      stderr: "pipe",
    });

    // Collect output
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    const output = stdout + (stderr ? `\n${stderr}` : "");
    const duration = Date.now() - startTime;

    return {
      output,
      exitCode,
      isComplete: this.detectCompletion(output),
      duration,
    };
  },

  detectCompletion(output: string): boolean {
    return output.includes("<promise>COMPLETE</promise>");
  },

  detectRateLimit(output: string): RateLimitInfo {
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
