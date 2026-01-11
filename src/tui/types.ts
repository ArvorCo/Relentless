/**
 * TUI Types
 *
 * State and props types for the TUI components
 */

import type { AgentName } from "../agents/types";

export interface Story {
  id: string;
  title: string;
  passes: boolean;
}

export interface AgentState {
  name: AgentName;
  displayName: string;
  active: boolean;
  rateLimited: boolean;
  resetTime?: Date;
}

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
  /** All agents with their states */
  agents: AgentState[];
  /** Agent output lines */
  outputLines: string[];
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Is running */
  isRunning: boolean;
  /** Is complete */
  isComplete: boolean;
  /** Error message if any */
  error?: string;
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
}
