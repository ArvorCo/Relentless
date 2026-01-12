/**
 * AgentOutput Component
 *
 * Scrolling window showing agent output
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";

interface AgentOutputProps {
  lines: string[];
  maxLines?: number;
}

export function AgentOutput({
  lines,
  maxLines = 8,
}: AgentOutputProps): React.ReactElement {
  const clampedMaxLines = Math.max(0, maxLines);
  const displayLines = clampedMaxLines > 0 ? lines.slice(-clampedMaxLines) : [];

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={colors.dim}>
      <Box paddingX={1} borderBottom borderColor={colors.dim}>
        <Text color={colors.dim} bold>
          Agent Output
        </Text>
      </Box>
      {clampedMaxLines > 0 && (
        <Box flexDirection="column" paddingX={1} height={clampedMaxLines}>
          {displayLines.length > 0 ? (
            displayLines.map((line, i) => (
              <Text key={i} color={colors.dim} wrap="truncate">
                {line}
              </Text>
            ))
          ) : (
            <Text color={colors.dim} dimColor>
              Waiting for agent output...
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
