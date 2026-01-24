/**
 * TUI Types
 *
 * State and props types for the TUI components
 */

import type { AgentName } from "../agents/types";
import type { QueueItem } from "../queue/types";

export interface Story {
  id: string;
  title: string;
  passes: boolean;
  priority: number;
  criteriaCount: number;
  research?: boolean;
  phase?: string;
  /** Dependencies that must complete first */
  dependencies?: string[];
  /** Whether blocked by unfinished dependencies */
  blocked?: boolean;
}

export interface AgentState {
  name: AgentName;
  displayName: string;
  active: boolean;
  rateLimited: boolean;
  resetTime?: Date;
}

/** Token usage tracking */
export interface TokenUsage {
  /** Input tokens used */
  inputTokens: number;
  /** Output tokens used */
  outputTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

/** Cost tracking data */
export interface CostData {
  /** Actual cost incurred so far (in dollars) */
  actual: number;
  /** Estimated total cost (in dollars) */
  estimated: number;
  /** Token usage breakdown */
  tokens: TokenUsage;
  /** Cost per story */
  perStory: number;
}

/** Message in the queue panel */
export interface MessageItem {
  /** Unique identifier */
  id: string;
  /** Timestamp when added */
  timestamp: Date;
  /** Message content */
  content: string;
  /** Message type for color coding */
  type: "command" | "prompt" | "system" | "info" | "error" | "success";
}

/** Layout mode for responsive design */
export type LayoutMode = "three-column" | "compressed" | "vertical";

/** Output panel display mode */
export type OutputMode = "normal" | "fullscreen";

export interface TUIState {
  /** Feature name */
  feature: string;
  /** Project name */
  project: string;
  /** Branch name */
  branchName: string;
  /** All stories */
  stories: Story[];
  /** Current iteration */
  iteration: number;
  /** Maximum iterations */
  maxIterations: number;
  /** Current story being worked on */
  currentStory: Story | null;
  /** Current agent */
  currentAgent: AgentState | null;
  /** Current routing decision (auto mode) */
  currentRouting?: {
    mode: "free" | "cheap" | "good" | "genius";
    complexity: "simple" | "medium" | "complex" | "expert";
    harness: AgentName;
    model: string;
  };
  /** All agents with their states */
  agents: AgentState[];
  /** Agent output lines */
  outputLines: string[];
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Idle time in seconds since last output */
  idleSeconds: number;
  /** Is running */
  isRunning: boolean;
  /** Is complete */
  isComplete: boolean;
  /** Error message if any */
  error?: string;
  /** Queue items for display */
  queueItems: QueueItem[];
  /** Whether queue input mode is active */
  queueInputActive: boolean;
  /** Current queue input value */
  queueInputValue: string;
  /** Whether queue delete mode is active (waiting for number input) */
  deleteMode: boolean;
  /** Whether confirm clear dialog is active */
  confirmClearActive: boolean;
  /** Status message to display (e.g., "Queue already empty") */
  statusMessage?: string;

  // Enhanced state for new TUI

  /** Cost and token tracking data */
  costData?: CostData;
  /** Messages in the queue panel (mIRC-style) */
  messages: MessageItem[];
  /** Current layout mode */
  layoutMode: LayoutMode;
  /** Output panel display mode */
  outputMode: OutputMode;
  /** Total elapsed time since start (seconds) */
  totalElapsedSeconds: number;
  /** Start time of current session */
  startTime?: Date;
  /** Savings compared to SOTA (percentage) */
  savingsPercent?: number;
}

export interface TUIActions {
  /** Add output line */
  addOutput: (line: string) => void;
  /** Clear output */
  clearOutput: () => void;
  /** Set current story */
  setCurrentStory: (story: Story | null) => void;
  /** Set current agent */
  setCurrentAgent: (agent: AgentState | null) => void;
  /** Mark agent as rate limited */
  markAgentLimited: (name: AgentName, resetTime?: Date) => void;
  /** Clear agent rate limit */
  clearAgentLimit: (name: AgentName) => void;
  /** Update story status */
  updateStory: (id: string, passes: boolean) => void;
  /** Set iteration */
  setIteration: (iteration: number) => void;
  /** Set running state */
  setRunning: (running: boolean) => void;
  /** Set complete */
  setComplete: (complete: boolean) => void;
  /** Set error */
  setError: (error: string | undefined) => void;
  /** Add a message to the queue panel */
  addMessage: (message: Omit<MessageItem, "id" | "timestamp">) => void;
  /** Update cost tracking data */
  updateCostData: (data: Partial<CostData>) => void;
  /** Toggle output fullscreen mode */
  toggleOutputMode: () => void;
  /** Set layout mode */
  setLayoutMode: (mode: LayoutMode) => void;
}

/** Props for panel components */
export interface PanelProps {
  /** Panel title */
  title?: string;
  /** Panel width (percentage or absolute) */
  width?: string | number;
  /** Panel height (lines) */
  height?: number;
  /** Border color */
  borderColor?: string;
  /** Whether panel is active/focused */
  active?: boolean;
}

/** Props for status bar sections */
export interface StatusSectionProps {
  /** Section label */
  label?: string;
  /** Section value */
  value: string;
  /** Value color */
  color?: string;
  /** Whether to show separator after */
  separator?: boolean;
}
