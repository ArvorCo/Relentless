/**
 * useCostTracking Hook
 *
 * Tracks and aggregates real-time cost and token usage
 */

import { useState, useCallback, useMemo } from "react";

export interface TokenUsage {
  /** Input tokens used */
  inputTokens: number;
  /** Output tokens used */
  outputTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

export interface CostData {
  /** Actual cost incurred so far (in dollars) */
  actual: number;
  /** Estimated total cost (in dollars) */
  estimated: number;
  /** Token usage breakdown */
  tokens: TokenUsage;
  /** Cost per story */
  perStory: number;
  /** Model usage breakdown */
  modelBreakdown: Map<string, { tokens: TokenUsage; cost: number }>;
}

export interface CostTrackingActions {
  /** Add token usage from an agent response */
  addUsage: (usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    cost?: number;
  }) => void;
  /** Update estimated cost */
  updateEstimate: (estimate: number) => void;
  /** Reset all tracking */
  reset: () => void;
}

/** Token pricing per model (approximate, in dollars per 1M tokens) */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Claude models
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-5-haiku": { input: 0.25, output: 1.25 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-opus-4": { input: 15, output: 75 },
  // OpenAI models (for reference/future)
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  // Default fallback
  default: { input: 3, output: 15 },
};

/**
 * Calculate cost for a given model and token usage
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Find matching pricing (partial match for model names)
  let pricing = MODEL_PRICING.default;
  for (const [key, value] of Object.entries(MODEL_PRICING)) {
    if (model.toLowerCase().includes(key.toLowerCase())) {
      pricing = value;
      break;
    }
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Format token count for display (e.g., "5.2K")
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format cost for display (e.g., "$0.12")
 */
export function formatCost(cost: number): string {
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`;
  } else if (cost >= 0.01) {
    return `$${cost.toFixed(2)}`;
  } else if (cost > 0) {
    return `$${cost.toFixed(3)}`;
  }
  return "$0.00";
}

/**
 * Hook for tracking cost and token usage across agent invocations
 */
export function useCostTracking(completedStories: number = 0): [CostData, CostTrackingActions] {
  const [data, setData] = useState<{
    actual: number;
    estimated: number;
    tokens: TokenUsage;
    modelBreakdown: Map<string, { tokens: TokenUsage; cost: number }>;
  }>({
    actual: 0,
    estimated: 0,
    tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    modelBreakdown: new Map(),
  });

  const addUsage = useCallback(
    (usage: {
      inputTokens: number;
      outputTokens: number;
      model: string;
      cost?: number;
    }) => {
      const { inputTokens, outputTokens, model, cost } = usage;
      const calculatedCost = cost ?? calculateCost(model, inputTokens, outputTokens);

      setData((prev) => {
        const newModelBreakdown = new Map(prev.modelBreakdown);
        const existing = newModelBreakdown.get(model) ?? {
          tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          cost: 0,
        };

        newModelBreakdown.set(model, {
          tokens: {
            inputTokens: existing.tokens.inputTokens + inputTokens,
            outputTokens: existing.tokens.outputTokens + outputTokens,
            totalTokens: existing.tokens.totalTokens + inputTokens + outputTokens,
          },
          cost: existing.cost + calculatedCost,
        });

        return {
          ...prev,
          actual: prev.actual + calculatedCost,
          tokens: {
            inputTokens: prev.tokens.inputTokens + inputTokens,
            outputTokens: prev.tokens.outputTokens + outputTokens,
            totalTokens: prev.tokens.totalTokens + inputTokens + outputTokens,
          },
          modelBreakdown: newModelBreakdown,
        };
      });
    },
    []
  );

  const updateEstimate = useCallback((estimate: number) => {
    setData((prev) => ({
      ...prev,
      estimated: estimate,
    }));
  }, []);

  const reset = useCallback(() => {
    setData({
      actual: 0,
      estimated: 0,
      tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      modelBreakdown: new Map(),
    });
  }, []);

  const costData = useMemo<CostData>(() => ({
    actual: data.actual,
    estimated: data.estimated,
    tokens: data.tokens,
    perStory: completedStories > 0 ? data.actual / completedStories : 0,
    modelBreakdown: data.modelBreakdown,
  }), [data, completedStories]);

  const actions = useMemo<CostTrackingActions>(
    () => ({
      addUsage,
      updateEstimate,
      reset,
    }),
    [addUsage, updateEstimate, reset]
  );

  return [costData, actions];
}
