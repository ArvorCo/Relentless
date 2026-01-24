/**
 * TokenCounter Component
 *
 * Token usage display with input/output breakdown
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import { formatTokens } from "../hooks/useCostTracking.js";
import type { TokenUsage } from "../types.js";

interface TokenCounterProps {
  /** Token usage data */
  tokens: TokenUsage;
  /** Whether to show compact view (only total) */
  compact?: boolean;
}

export function TokenCounter({
  tokens,
  compact = false,
}: TokenCounterProps): React.ReactElement {
  const inputFormatted = formatTokens(tokens.inputTokens);
  const outputFormatted = formatTokens(tokens.outputTokens);
  const totalFormatted = formatTokens(tokens.totalTokens);

  if (compact) {
    return (
      <Text color={colors.primary}>
        {totalFormatted}
      </Text>
    );
  }

  return (
    <Box>
      <Text color={colors.dim}>
        {inputFormatted}
      </Text>
      <Text color={colors.dim}> in / </Text>
      <Text color={colors.primary}>
        {outputFormatted}
      </Text>
      <Text color={colors.dim}> out</Text>
    </Box>
  );
}
