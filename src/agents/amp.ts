/**
 * Amp Agent Adapter
 *
 * Adapter for Sourcegraph's Amp CLI
 * https://ampcode.com
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

    const proc = Bun.spawn(["amp", ...args], {
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
