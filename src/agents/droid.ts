/**
 * Droid Agent Adapter
 *
 * Adapter for Factory's Droid CLI
 * https://factory.ai
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";

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
    const startTime = Date.now();

    // Droid reads from stdin when piped or redirected.
    // Use --auto high for high risk tolerance by default
    const proc = Bun.spawn(["droid", "exec", "--auto", "high"], {
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
