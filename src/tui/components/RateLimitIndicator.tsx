/**
 * RateLimitIndicator Component
 *
 * Rate limit countdown display for agents
 */

import React from "react";
import { Box, Text } from "ink";
import { colors, symbols } from "../theme.js";
import { useCountdown } from "../hooks/useAnimation.js";
import type { AgentState } from "../types.js";

interface RateLimitIndicatorProps {
  /** All agent states */
  agents: AgentState[];
  /** Whether to show compact view */
  compact?: boolean;
  /** Maximum agents to show */
  maxAgents?: number;
}

interface AgentCountdownProps {
  agent: AgentState;
  compact: boolean;
}

function AgentCountdown({ agent, compact }: AgentCountdownProps): React.ReactElement | null {
  const countdown = useCountdown(agent.resetTime, agent.rateLimited);

  if (!agent.rateLimited || !countdown) {
    return null;
  }

  if (compact) {
    return (
      <Text color={colors.status.rateLimited}>
        {agent.name.substring(0, 3)}: {countdown.display}
      </Text>
    );
  }

  return (
    <Box>
      <Text color={colors.status.rateLimited}>
        {symbols.clock} {agent.displayName}: {countdown.display}
      </Text>
    </Box>
  );
}

export function RateLimitIndicator({
  agents,
  compact = false,
  maxAgents = 3,
}: RateLimitIndicatorProps): React.ReactElement | null {
  // Filter to rate-limited agents only
  const limitedAgents = agents.filter((a) => a.rateLimited);

  if (limitedAgents.length === 0) {
    return null;
  }

  const visibleAgents = limitedAgents.slice(0, maxAgents);
  const hasMore = limitedAgents.length > maxAgents;

  if (compact) {
    return (
      <Box>
        {visibleAgents.map((agent, i) => (
          <React.Fragment key={agent.name}>
            {i > 0 && <Text color={colors.dim}> </Text>}
            <AgentCountdown agent={agent} compact />
          </React.Fragment>
        ))}
        {hasMore && (
          <Text color={colors.dim}> +{limitedAgents.length - maxAgents}</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color={colors.status.rateLimited} bold>
        Rate Limited:
      </Text>
      {visibleAgents.map((agent) => (
        <AgentCountdown key={agent.name} agent={agent} compact={false} />
      ))}
      {hasMore && (
        <Text color={colors.dim}>
          +{limitedAgents.length - maxAgents} more
        </Text>
      )}
    </Box>
  );
}
