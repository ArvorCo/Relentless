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
 * With model: `opencode run --model <provider/model> "<prompt>"`
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
import { getModelById } from "../routing/registry";
import { runCommand } from "./exec";

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
    // Build command arguments
    // Format: opencode run [--model <model>] "<prompt>"
    const args = ["opencode", "run", "--print-logs", "--log-level", "INFO"];

    // Add model flag if provided
    if (options?.model) {
      const modelProfile = getModelById(options.model);
      if (modelProfile?.harness === "opencode") {
        args.push("--model", modelProfile.cliValue);
        if (modelProfile.cliArgs) {
          args.push(...modelProfile.cliArgs);
        }
      } else {
        args.push("--model", options.model);
      }
    }

    // Add the prompt as the final argument
    args.push(prompt);

    const result = await runCommand(args, {
      cwd: options?.workingDirectory,
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

  async *invokeStream(prompt: string, options?: InvokeOptions): AsyncGenerator<string, AgentResult, void> {
    const args = ["opencode", "run", "--print-logs", "--log-level", "INFO"];

    if (options?.model) {
      const modelProfile = getModelById(options.model);
      if (modelProfile?.harness === "opencode") {
        args.push("--model", modelProfile.cliValue);
        if (modelProfile.cliArgs) {
          args.push(...modelProfile.cliArgs);
        }
      } else {
        args.push("--model", options.model);
      }
    }

    args.push(prompt);

    const startTime = Date.now();
    const proc = Bun.spawn(args, {
      cwd: options?.workingDirectory,
      stdout: "pipe",
      stderr: "pipe",
    });

    const decoder = new TextDecoder();
    let stdout = "";
    let stderr = "";
    let lastOutput = Date.now();
    let timedOut = false;
    let idleTimer: ReturnType<typeof setInterval> | undefined;

    const queue: string[] = [];
    let done = false;
    let notify: (() => void) | null = null as (() => void) | null;

    const pushChunk = (chunk: string) => {
      if (!chunk) return;
      queue.push(chunk);
      lastOutput = Date.now();
      const notifyCallback = notify;
      if (notifyCallback) {
        notifyCallback();
        notify = null;
      }
    };

    const readStream = async (
      stream: ReadableStream<Uint8Array>,
      assign: (chunk: string) => void
    ) => {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) {
              assign(chunk);
              pushChunk(chunk);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    };

    if (options?.timeout && options.timeout > 0) {
      idleTimer = setInterval(() => {
        if (Date.now() - lastOutput > options.timeout!) {
          timedOut = true;
          try {
            proc.kill();
          } catch {
            // Best-effort kill on timeout.
          }
        }
      }, 500);
    }

    const stdoutTask = readStream(proc.stdout, (chunk) => {
      stdout += chunk;
    });
    const stderrTask = readStream(proc.stderr, (chunk) => {
      stderr += chunk;
    });

    const exitTask = (async () => {
      await Promise.all([stdoutTask, stderrTask]);
      const exitCode = await proc.exited;
      done = true;
      const notifyCallback = notify;
      if (notifyCallback) {
        notifyCallback();
        notify = null;
      }
      return exitCode;
    })();

    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve;
        });
        continue;
      }
      const chunk = queue.shift();
      if (chunk) {
        yield chunk;
      }
    }

    const exitCode = await exitTask;

    if (idleTimer) {
      clearInterval(idleTimer);
    }

    const timeoutNote =
      timedOut && options?.timeout
        ? `\n[Relentless] Idle timeout after ${options.timeout}ms.`
        : "";
    const output = stdout + (stderr ? `\n${stderr}` : "") + timeoutNote;
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
    // NOTE: Idle timeout is NOT a rate limit - it just means the agent stopped
    // producing output for a while, which is normal behavior for complex tasks.

    // OpenCode rate limit patterns
    const patterns = [
      /rate limited/i,
      /try again later/i,
      /quota exceeded/i,
      /\b429\b/,
      /operation not permitted/i,
      /\beperm\b/i,
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
