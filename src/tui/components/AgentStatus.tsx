/**
 * AgentStatus Component
 *
 * Footer showing agent availability and rate limit status
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import type { AgentState } from "../types.js";

interface AgentStatusProps {
  agents: AgentState[];
  iteration: number;
  maxIterations: number;
}

function formatResetTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AgentStatus({
  agents,
  iteration,
  maxIterations,
}: AgentStatusProps): React.ReactElement {
  // Find next reset time
  const nextReset = agents
    .filter((a) => a.rateLimited && a.resetTime)
    .sort((a, b) => (a.resetTime?.getTime() ?? 0) - (b.resetTime?.getTime() ?? 0))[0];

  return (
    <Box
      paddingX={1}
      paddingY={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      <Box>
        <Text color={colors.dim}>Agents: </Text>
        {agents.map((agent, i) => (
          <React.Fragment key={agent.name}>
            <Text color={colors.dim}>{agent.name} </Text>
            <Text color={agent.active ? colors.success : agent.rateLimited ? colors.warning : colors.dim}>
              {agent.active ? "●" : agent.rateLimited ? "○" : "○"}
            </Text>
            {i < agents.length - 1 && <Text color={colors.dim}> </Text>}
          </React.Fragment>
        ))}
      </Box>
      <Box>
        <Text color={colors.dim}>
          Iteration: {iteration}/{maxIterations}
        </Text>
        {nextReset?.resetTime && (
          <Text color={colors.dim}>
            {"  "}Next reset: {nextReset.name} @ {formatResetTime(nextReset.resetTime)}
          </Text>
        )}
      </Box>
    </Box>
  );
}
