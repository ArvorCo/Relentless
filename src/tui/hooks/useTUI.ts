/**
 * useTUI Hook
 *
 * Main state management hook for the TUI
 */

import { useState, useCallback } from "react";
import type { TUIState, TUIActions, Story, AgentState } from "../types.js";
import type { AgentName } from "../../agents/types.js";

interface UseTUIOptions {
  feature: string;
  project: string;
  branchName: string;
  stories: Story[];
  maxIterations: number;
  agents: AgentState[];
}

interface UseTUIReturn {
  state: TUIState;
  actions: TUIActions;
}

export function useTUI(options: UseTUIOptions): UseTUIReturn {
  const [state, setState] = useState<TUIState>({
    feature: options.feature,
    project: options.project,
    branchName: options.branchName,
    stories: options.stories,
    iteration: 0,
    maxIterations: options.maxIterations,
    currentStory: null,
    currentAgent: null,
    agents: options.agents,
    outputLines: [],
    elapsedSeconds: 0,
    isRunning: false,
    isComplete: false,
    error: undefined,
    queueItems: [],
  });

  const addOutput = useCallback((line: string) => {
    setState((prev) => ({
      ...prev,
      outputLines: [...prev.outputLines, line],
    }));
  }, []);

  const clearOutput = useCallback(() => {
    setState((prev) => ({
      ...prev,
      outputLines: [],
    }));
  }, []);

  const setCurrentStory = useCallback((story: Story | null) => {
    setState((prev) => ({
      ...prev,
      currentStory: story,
    }));
  }, []);

  const setCurrentAgent = useCallback((agent: AgentState | null) => {
    setState((prev) => ({
      ...prev,
      currentAgent: agent,
      agents: prev.agents.map((a) => ({
        ...a,
        active: agent ? a.name === agent.name : false,
      })),
    }));
  }, []);

  const markAgentLimited = useCallback((name: AgentName, resetTime?: Date) => {
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) =>
        a.name === name ? { ...a, rateLimited: true, resetTime, active: false } : a
      ),
      currentAgent:
        prev.currentAgent?.name === name
          ? { ...prev.currentAgent, rateLimited: true, resetTime }
          : prev.currentAgent,
    }));
  }, []);

  const clearAgentLimit = useCallback((name: AgentName) => {
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) =>
        a.name === name ? { ...a, rateLimited: false, resetTime: undefined } : a
      ),
    }));
  }, []);

  const updateStory = useCallback((id: string, passes: boolean) => {
    setState((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => (s.id === id ? { ...s, passes } : s)),
    }));
  }, []);

  const setIteration = useCallback((iteration: number) => {
    setState((prev) => ({
      ...prev,
      iteration,
    }));
  }, []);

  const setRunning = useCallback((isRunning: boolean) => {
    setState((prev) => ({
      ...prev,
      isRunning,
    }));
  }, []);

  const setComplete = useCallback((isComplete: boolean) => {
    setState((prev) => ({
      ...prev,
      isComplete,
    }));
  }, []);

  const setError = useCallback((error: string | undefined) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  const actions: TUIActions = {
    addOutput,
    clearOutput,
    setCurrentStory,
    setCurrentAgent,
    markAgentLimited,
    clearAgentLimit,
    updateStory,
    setIteration,
    setRunning,
    setComplete,
    setError,
  };

  return { state, actions };
}
