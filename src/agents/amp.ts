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
 * Amp uses the `AMP_MODE` environment variable for mode selection,
 * unlike other adapters which use CLI flags.
 *
 * ## Usage Example
 * ```typescript
 * const result = await ampAdapter.invoke("Fix the bug", {
 *   model: "free",  // Sets AMP_MODE=free environment variable
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 *
 * @module agents/amp
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";

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
    const startTime = Date.now();
    const args: string[] = [];

    if (options?.dangerouslyAllowAll) {
      args.push("--dangerously-allow-all");
    }

    // Build spawn options with environment variables
    const spawnOptions: {
      cwd?: string;
      stdin: Blob;
      stdout: "pipe";
      stderr: "pipe";
      env?: Record<string, string | undefined>;
    } = {
      cwd: options?.workingDirectory,
      stdin: new Blob([prompt]),
      stdout: "pipe",
      stderr: "pipe",
    };

    // Set AMP_MODE environment variable if model is provided
    // Amp uses environment variable instead of CLI flag for mode selection
    if (options?.model) {
      spawnOptions.env = {
        ...process.env,
        AMP_MODE: options.model,
      };
    }

    const proc = Bun.spawn(["amp", ...args], spawnOptions);

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
    // Amp rate limit patterns
    const patterns = [
      /quota exceeded/i,
      /limit reached/i,
      /rate limit/i,
      /too many requests/i,
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
