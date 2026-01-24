/**
 * Gemini Agent Adapter
 *
 * Adapter for Google's Gemini CLI with model selection support.
 * https://github.com/google-gemini/gemini-cli
 *
 * ## Supported Models
 * - `gemini-3-pro` - Gemini 3 Pro (best for complex reasoning and coding tasks)
 * - `gemini-3-flash` - Gemini 3 Flash (faster, more cost-effective for simpler tasks)
 *
 * ## CLI Command Format
 * With model: `gemini --model <model> --prompt "<prompt>"`
 * Without model: `gemini --prompt "<prompt>"`
 * With dangerous mode: `gemini --yolo --model <model> --prompt "<prompt>"`
 *
 * ## Usage Example
 * ```typescript
 * const result = await geminiAdapter.invoke("Fix the bug", {
 *   model: "gemini-3-pro",
 *   dangerouslyAllowAll: true,  // Sets --yolo flag
 *   workingDirectory: "/path/to/project"
 * });
 * ```
 *
 * @module agents/gemini
 */

import type { AgentAdapter, AgentResult, InvokeOptions, RateLimitInfo } from "./types";
import { getModelById } from "../routing/registry";
import { runCommand } from "./exec";

export const geminiAdapter: AgentAdapter = {
  name: "gemini",
  displayName: "Gemini CLI",
  hasSkillSupport: true, // Uses extension system
  skillInstallCommand: "gemini extensions install https://github.com/ArvorCo/Relentless",

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
    const args: string[] = [];

    if (options?.dangerouslyAllowAll) {
      args.push("--yolo");
    }

    if (options?.model) {
      const modelProfile = getModelById(options.model);
      if (modelProfile?.harness === "gemini") {
        args.push("--model", modelProfile.cliValue);
        if (modelProfile.cliArgs) {
          args.push(...modelProfile.cliArgs);
        }
      } else {
        args.push("--model", options.model);
      }
    }

    // Gemini CLI uses -p/--prompt for non-interactive prompts
    args.push("--prompt", prompt);

    const result = await runCommand(["gemini", ...args], {
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

  detectCompletion(output: string): boolean {
    return output.includes("<promise>COMPLETE</promise>");
  },

  detectRateLimit(output: string): RateLimitInfo {
    // NOTE: Idle timeout is NOT a rate limit - it just means the agent stopped
    // producing output for a while, which is normal behavior for complex tasks.

    // Gemini rate limit patterns
    const patterns = [
      /quota exceeded/i,
      /resource exhausted/i,
      /rate limit/i,
      /\b429\b/,
      /too many requests/i,
      /operation not permitted/i,
      /\beperm\b/i,
      /error initializing chat recording service/i,
      /err_module_not_found/i,
      /cannot find package/i,
      /data collection is disabled/i,
      /gemini_api_key/i,
      /google_genai_use_vertexai/i,
      /google_genai_use_gca/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(output)) {
        return {
          limited: true,
          message: "Gemini rate limit exceeded",
        };
      }
    }

    return { limited: false };
  },

  async installSkills(_projectPath: string): Promise<void> {
    // Gemini uses extensions, we can't install project-local
    // Users need to run: gemini extensions install <url>
    console.log(
      `To install Relentless skills for Gemini, run:\n  ${this.skillInstallCommand}`
    );
  },
};
