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
 * - `opus-4.5` (claude-opus-4-5) - SOTA, best for code review and architecture
 * - `sonnet-4.5` (claude-sonnet-4-5) - Balanced, good for daily coding
 * - `haiku-4.5` (claude-haiku-4-5) - Fast and cheap, good for simple tasks
 *
 * These IDs map to the full Claude model identifiers in the CLI.
 *
 * **CLI command format:**
 * ```
 * claude --model <model> -p <prompt>
 * ```
 *
 * @example
 * ```typescript
 * const result = await claudeAdapter.invoke("Fix the bug", {
 *   model: "opus-4.5",
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types.js";
import { getModelById } from "../routing/registry";
import { runCommand } from "./exec";

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
    const args = ["-p"];

    if (options?.dangerouslyAllowAll) {
      args.push("--dangerously-skip-permissions");
    }

    if (options?.model) {
      const modelProfile = getModelById(options.model);
      if (modelProfile?.harness === "claude") {
        args.push("--model", modelProfile.cliValue);
      } else {
        args.push("--model", options.model);
      }
    }

    // Build environment variables
    const env: Record<string, string> = {};
    if (options?.taskListId) {
      env.CLAUDE_CODE_TASK_LIST_ID = options.taskListId;
    }

    const result = await runCommand(["claude", ...args], {
      cwd: options?.workingDirectory,
      stdin: new Blob([prompt]),
      timeoutMs: options?.timeout,
      env: Object.keys(env).length > 0 ? env : undefined,
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
      const modelProfile = getModelById(options.model);
      if (modelProfile?.harness === "claude") {
        args.push("--model", modelProfile.cliValue);
      } else {
        args.push("--model", options.model);
      }
    }

    // Build environment variables for streaming
    const streamEnv: Record<string, string> = {};
    if (options?.taskListId) {
      streamEnv.CLAUDE_CODE_TASK_LIST_ID = options.taskListId;
    }

    const proc = Bun.spawn(["claude", ...args], {
      cwd: options?.workingDirectory,
      stdin: new Blob([prompt]),
      stdout: "pipe",
      stderr: "pipe",
      env: Object.keys(streamEnv).length > 0
        ? { ...process.env, ...streamEnv }
        : undefined,
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
    // Debug: Log to file when rate limit is detected
    const debugRateLimit = (pattern: string, message: string) => {
      if (process.env.RELENTLESS_DEBUG) {
        const debugInfo = {
          timestamp: new Date().toISOString(),
          pattern,
          message,
          outputLength: output.length,
          outputSample: output.slice(0, 500),
          outputEnd: output.slice(-500),
        };
        console.error(`[RELENTLESS_DEBUG] Rate limit detected: ${JSON.stringify(debugInfo, null, 2)}`);
      }
    };

    // NOTE: Idle timeout is NOT a rate limit - it just means the agent stopped
    // producing output for a while, which is normal behavior for complex tasks.
    // We should NOT switch agents on idle timeout.

    if (/(?:operation not permitted|permission denied|\beperm\b).*(?:\/\.claude|\.claude)/i.test(output)) {
      debugRateLimit("permission_error", "Claude unavailable due to permission error");
      return {
        limited: true,
        message: "Claude unavailable due to permission error",
      };
    }

    // More specific pattern for actual API model not found errors
    // Only match JSON API error responses, not conversational mentions
    const modelNotFoundPattern = /"type":\s*"not_found_error".*"model"/i;
    if (modelNotFoundPattern.test(output)) {
      debugRateLimit("model_not_found", "Claude model not found");
      return {
        limited: true,
        message: "Claude model not found",
      };
    }

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

      debugRateLimit("hit_your_limit", "Claude Code rate limit exceeded");
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
