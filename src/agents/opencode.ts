/**
 * OpenCode Agent Adapter
 *
 * Adapter for the OpenCode CLI with model selection support.
 * https://opencode.ai
 *
 * ## Supported Models (OpenCode Zen - Free Tier)
 * - `glm-4.7` - GLM-4.7 (73.8% SWE-bench, excellent for multilingual/backend)
 * - `grok-code-fast-1` - Grok Code Fast 1 (speed-optimized for agentic tasks)
 * - `minimax-m2.1` - MiniMax M2.1 (general purpose)
 *
 * ## CLI Command Format
 * With model: `opencode run --model <model> "<prompt>"`
 * Without model: `opencode run "<prompt>"`
 *
 * ## Usage Example
 * ```typescript
 * const result = await opencodeAdapter.invoke("Fix the bug", {
 *   model: "glm-4.7",
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 *
 * @module agents/opencode
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";

export const opencodeAdapter: AgentAdapter = {
  name: "opencode",
  displayName: "OpenCode",
  hasSkillSupport: true,
  skillInstallCommand: "opencode skill add <skill-name>",

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
      const proc = Bun.spawn(["which", "opencode"], { stdout: "pipe" });
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

    // Build command arguments
    // Format: opencode run [--model <model>] "<prompt>"
    const args = ["opencode", "run"];

    // Add model flag if provided
    if (options?.model) {
      args.push("--model", options.model);
    }

    // Add the prompt as the final argument
    args.push(prompt);

    const proc = Bun.spawn(args, {
      cwd: options?.workingDirectory,
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
    // OpenCode rate limit patterns
    const patterns = [
      /rate limited/i,
      /try again later/i,
      /quota exceeded/i,
      /\b429\b/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(output)) {
        return {
          limited: true,
          message: "OpenCode rate limit exceeded",
        };
      }
    }

    return { limited: false };
  },

  async installSkills(projectPath: string): Promise<void> {
    // OpenCode uses .opencode/skill/ (SINGULAR!) for skills
    const skillsDir = `${projectPath}/.opencode/skill`;
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
