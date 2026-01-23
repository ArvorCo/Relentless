/**
 * Relentless Agent Adapter Types
 *
 * Defines the interface that all AI coding agents must implement
 * to work with the Relentless orchestrator.
 */

export type AgentName = "claude" | "amp" | "opencode" | "codex" | "droid" | "gemini";

export interface InvokeOptions {
  /** Working directory for the agent */
  workingDirectory?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Model to use (agent-specific) */
  model?: string;
  /** Skip all permission prompts */
  dangerouslyAllowAll?: boolean;
  /** Claude Code TaskList ID for cross-session coordination */
  taskListId?: string;
}

/**
 * Rate limit detection result
 */
export interface RateLimitInfo {
  /** Whether the agent is rate limited */
  limited: boolean;
  /** When the rate limit resets (if known) */
  resetTime?: Date;
  /** Raw error message */
  message?: string;
}

export interface AgentResult {
  /** Raw output from the agent */
  output: string;
  /** Exit code of the process */
  exitCode: number;
  /** Whether the agent signaled completion */
  isComplete: boolean;
  /** Duration in milliseconds */
  duration: number;
  /** Whether the agent hit rate limits */
  rateLimited?: boolean;
  /** When the rate limit resets */
  resetTime?: Date;
}

export interface AgentAdapter {
  /** Agent identifier */
  name: AgentName;

  /** Human-readable display name */
  displayName: string;

  /** Check if the agent is installed on this system */
  isInstalled(): Promise<boolean>;

  /** Get the path to the agent executable */
  getExecutablePath(): Promise<string | null>;

  /** Invoke the agent with a prompt */
  invoke(prompt: string, options?: InvokeOptions): Promise<AgentResult>;

  /** Invoke the agent with streaming output */
  invokeStream?(
    prompt: string,
    options?: InvokeOptions
  ): AsyncGenerator<string, AgentResult, unknown>;

  /** Detect if the output indicates completion */
  detectCompletion(output: string): boolean;

  /** Detect if the output indicates rate limiting */
  detectRateLimit(output: string): RateLimitInfo;

  /** Whether this agent supports skills/plugins */
  hasSkillSupport: boolean;

  /** Command to install skills for this agent (if supported) */
  skillInstallCommand?: string;

  /** Install skills to the agent (if supported) */
  installSkills?(projectPath: string): Promise<void>;
}

/**
 * Story types for smart routing
 */
export type StoryType = "database" | "ui" | "api" | "test" | "refactor" | "docs" | "general";

/**
 * Agent specializations for smart routing
 */
export const AGENT_SPECIALIZATIONS: Record<AgentName, StoryType[]> = {
  claude: ["database", "refactor", "api", "general"],
  amp: ["ui", "test", "general"],
  opencode: ["api", "general"],
  codex: ["api", "database", "general"],
  droid: ["refactor", "test", "general"],
  gemini: ["docs", "general"],
};
