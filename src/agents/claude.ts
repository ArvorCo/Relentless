/**
 * Claude Code Agent Adapter
 *
 * Adapter for Anthropic's Claude Code CLI
 * https://docs.anthropic.com/claude-code
 */

import type { AgentAdapter, AgentResult, InvokeOptions } from "./types";

export const claudeAdapter: AgentAdapter = {
  name: "claude",
  displayName: "Claude Code",
  hasSkillSupport: true,
  skillInstallCommand: "/plugin install github:arvor/relentless",

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
      const proc = Bun.spawn(["which", "claude"], { stdout: "pipe" });
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
    const args = ["-p"];

    if (options?.dangerouslyAllowAll) {
      args.push("--dangerously-skip-permissions");
    }

    if (options?.model) {
      args.push("--model", options.model);
    }

    const proc = Bun.spawn(["claude", ...args], {
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

  async installSkills(projectPath: string): Promise<void> {
    // Claude Code reads skills from .claude/skills/ in the project
    const skillsDir = `${projectPath}/.claude/skills`;
    await Bun.spawn(["mkdir", "-p", skillsDir]).exited;

    // Copy our skills to the project
    const relentlessRoot = import.meta.dir.replace("/src/agents", "");
    await Bun.spawn([
      "cp",
      "-r",
      `${relentlessRoot}/skills/prd`,
      `${skillsDir}/`,
    ]).exited;
    await Bun.spawn([
      "cp",
      "-r",
      `${relentlessRoot}/skills/relentless`,
      `${skillsDir}/`,
    ]).exited;
  },
};
