/**
 * Claude Code Agent Adapter
 *
 * Adapter for Anthropic's Claude Code CLI.
 * https://docs.anthropic.com/claude-code
 *
 * ## Model Selection
 *
 * Claude Code supports model selection via the `--model` flag.
 * Pass the model name in the `options.model` parameter.
 *
 * **Supported models:**
 * - `opus-4-5` (claude-opus-4-5-20251101) - SOTA, best for code review and architecture
 * - `sonnet-4-5` (claude-sonnet-4-5-20251020) - Balanced, good for daily coding
 * - `haiku-4-5` (claude-haiku-4-5-20251022) - Fast and cheap, good for simple tasks
 *
 * **CLI command format:**
 * ```
 * claude --model <model> -p <prompt>
 * ```
 *
 * @example
 * ```typescript
 * const result = await claudeAdapter.invoke("Fix the bug", {
 *   model: "opus-4-5",
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types.js";

export const claudeAdapter: AgentAdapter = {
  name: "claude",
  displayName: "Claude Code",
  hasSkillSupport: true,
  skillInstallCommand: "/plugin install github:ArvorCo/Relentless",

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

  async *invokeStream(
    prompt: string,
    options?: InvokeOptions
  ): AsyncGenerator<string, AgentResult, unknown> {
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

    const decoder = new TextDecoder();
    let fullOutput = "";

    // Stream stdout
    const reader = proc.stdout.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullOutput += chunk;
        yield chunk;
      }
    } finally {
      reader.releaseLock();
    }

    // Collect any stderr
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    const output = fullOutput + (stderr ? `\n${stderr}` : "");
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
    // Pattern: "You've hit your limit · resets 12am (America/Sao_Paulo)"
    if (output.includes("You've hit your limit") || output.includes("you've hit your limit")) {
      const resetMatch = output.match(/resets\s+(\d{1,2})(am|pm)/i);
      let resetTime: Date | undefined;

      if (resetMatch) {
        const hour = parseInt(resetMatch[1], 10);
        const isPM = resetMatch[2].toLowerCase() === "pm";
        const now = new Date();

        resetTime = new Date(now);
        resetTime.setHours(isPM && hour !== 12 ? hour + 12 : hour === 12 && !isPM ? 0 : hour);
        resetTime.setMinutes(0);
        resetTime.setSeconds(0);
        resetTime.setMilliseconds(0);

        // If reset time is in the past, move to tomorrow
        if (resetTime <= now) {
          resetTime.setDate(resetTime.getDate() + 1);
        }
      }

      return {
        limited: true,
        resetTime,
        message: "Claude Code rate limit exceeded",
      };
    }

    return { limited: false };
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
