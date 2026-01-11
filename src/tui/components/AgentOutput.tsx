/**
 * AgentOutput Component
 *
 * Scrolling window showing agent output
 */

import React from "react";
import { Box, Text } from "ink";
import { colors, borders } from "../theme.js";

interface AgentOutputProps {
  lines: string[];
  maxLines?: number;
}

export function AgentOutput({
  lines,
  maxLines = 8,
}: AgentOutputProps): React.ReactElement {
  // Take last N lines for display
  const displayLines = lines.slice(-maxLines);

  // Pad to maintain consistent height
  const paddedLines = [...displayLines];
  while (paddedLines.length < maxLines) {
    paddedLines.push("");
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={colors.dim}>
      <Box paddingX={1} borderBottom borderColor={colors.dim}>
        <Text color={colors.dim} bold>
          Agent Output
        </Text>
      </Box>
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        {paddedLines.map((line, i) => (
          <Text key={i} color={colors.dim} wrap="truncate">
            {line || " "}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
