/**
 * Header Component
 *
 * Displays title and current agent status
 */

import React from "react";
import { Box, Text } from "ink";
import { symbols, colors } from "../theme.js";
import type { AgentState } from "../types.js";

interface HeaderProps {
  agent: AgentState | null;
}

export function Header({ agent }: HeaderProps): React.ReactElement {
  return (
    <Box
      paddingX={1}
      paddingY={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      <Box>
        <Text color={colors.primary} bold>
          {symbols.lightning} RELENTLESS
        </Text>
        <Text color={colors.dim}> Universal AI Agent Orchestrator</Text>
      </Box>
      <Box>
        <Text color={colors.dim}>Agent: </Text>
        {agent ? (
          <>
            <Text color={agent.rateLimited ? colors.warning : colors.success} bold>
              {agent.displayName}
            </Text>
            <Text color={colors.dim}>
              {" "}
              ({agent.rateLimited ? "limited" : "active"})
            </Text>
          </>
        ) : (
          <Text color={colors.dim}>none</Text>
        )}
      </Box>
    </Box>
  );
}
