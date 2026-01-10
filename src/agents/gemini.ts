/**
 * Gemini Agent Adapter
 *
 * Adapter for Google's Gemini CLI
 * https://github.com/google-gemini/gemini-cli
 */

import type { AgentAdapter, AgentResult, InvokeOptions } from "./types";

export const geminiAdapter: AgentAdapter = {
  name: "gemini",
  displayName: "Gemini CLI",
  hasSkillSupport: true, // Uses extension system
  skillInstallCommand: "gemini extensions install https://github.com/arvor/relentless",

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
      const proc = Bun.spawn(["which", "gemini"], { stdout: "pipe" });
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
      args.push("--yolo");
    }

    if (options?.model) {
      args.push("--model", options.model);
    }

    // Gemini CLI accepts prompt as positional argument
    args.push(prompt);

    const proc = Bun.spawn(["gemini", ...args], {
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

  async installSkills(projectPath: string): Promise<void> {
    // Gemini uses extensions, we can't install project-local
    // Users need to run: gemini extensions install <url>
    console.log(
      `To install Relentless skills for Gemini, run:\n  ${this.skillInstallCommand}`
    );
  },
};
