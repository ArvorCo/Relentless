/**
 * StatusBar Component
 *
 * Bottom bar showing real-time metrics: cost, tokens, mode, rate limits, iteration, time, savings
 */

import React from "react";
import { Box, Text } from "ink";
import { colors, borders, badges, symbols } from "../theme.js";
import { CostBadge } from "./CostBadge.js";
import { TokenCounter } from "./TokenCounter.js";
import { RateLimitIndicator } from "./RateLimitIndicator.js";
import type { AgentState, CostData, TokenUsage } from "../types.js";
import type { AgentName } from "../../agents/types.js";

interface StatusBarProps {
  /** Cost tracking data */
  costData?: CostData;
  /** Token usage */
  tokens?: TokenUsage;
  /** Current iteration */
  iteration: number;
  /** Maximum iterations */
  maxIterations: number;
  /** All agent states */
  agents: AgentState[];
  /** Total elapsed seconds */
  elapsedSeconds: number;
  /** Current mode */
  mode?: "free" | "cheap" | "good" | "genius";
  /** Current complexity */
  complexity?: "simple" | "medium" | "complex" | "expert";
  /** Current harness/agent */
  harness?: AgentName;
  /** Current model */
  model?: string;
  /** Savings percentage vs SOTA */
  savingsPercent?: number;
  /** Completed stories count */
  completedStories?: number;
  /** Total stories count */
  totalStories?: number;
}

/**
 * Format elapsed time as MM:SS or HH:MM:SS
 */
function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}

/**
 * Separator component
 */
function Separator(): React.ReactElement {
  return (
    <Text color={colors.dim}> {borders.vertical} </Text>
  );
}

export function StatusBar({
  costData,
  tokens,
  iteration,
  maxIterations,
  agents,
  elapsedSeconds,
  mode,
  complexity,
  harness,
  model,
  savingsPercent,
  completedStories,
  totalStories,
}: StatusBarProps): React.ReactElement {
  // Get mode badge styling
  const modeBadge = mode ? badges.mode[mode] : null;
  const complexityBadge = complexity ? badges.complexity[complexity] : null;

  // Check for rate-limited agents
  const hasRateLimits = agents.some((a) => a.rateLimited);

  return (
    <Box
      width="100%"
      paddingX={1}
      borderStyle="single"
      borderColor={colors.dim}
      justifyContent="space-between"
    >
      {/* Left section: Cost & Tokens */}
      <Box>
        {costData && (
          <>
            <CostBadge
              actual={costData.actual}
              estimated={costData.estimated}
              compact
            />
            <Separator />
          </>
        )}

        {tokens && (
          <>
            <TokenCounter tokens={tokens} compact />
            <Separator />
          </>
        )}

        {/* Iteration counter */}
        <Text color={colors.dim}>
          {iteration}/{maxIterations}
        </Text>

        {/* Stories progress */}
        {completedStories !== undefined && totalStories !== undefined && (
          <>
            <Separator />
            <Text color={completedStories === totalStories ? colors.success : colors.warning}>
              {completedStories}/{totalStories}
            </Text>
          </>
        )}
      </Box>

      {/* Center section: Mode/Routing info */}
      <Box>
        {modeBadge && (
          <>
            <Text color={modeBadge.color as string} bold>
              {modeBadge.text}
            </Text>
            {complexityBadge && (
              <>
                <Text color={colors.dim}>/</Text>
                <Text color={complexityBadge.color as string}>
                  {complexityBadge.text}
                </Text>
              </>
            )}
          </>
        )}

        {harness && model && (
          <>
            <Text color={colors.dim}> {symbols.arrow} </Text>
            <Text color={colors.primary}>{harness}</Text>
            <Text color={colors.dim}>/</Text>
            <Text color={colors.dim}>{model}</Text>
          </>
        )}
      </Box>

      {/* Right section: Rate limits, Time, Savings */}
      <Box>
        {/* Rate limit indicators */}
        {hasRateLimits && (
          <>
            <RateLimitIndicator agents={agents} compact maxAgents={1} />
            <Separator />
          </>
        )}

        {/* Elapsed time */}
        <Text color={colors.dim}>{formatElapsedTime(elapsedSeconds)}</Text>

        {/* Savings indicator */}
        {savingsPercent !== undefined && savingsPercent > 0 && (
          <>
            <Separator />
            <Text color={colors.success}>
              {savingsPercent}% saved
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}
