/**
 * ProgressBar Component
 *
 * Visual progress bar for story completion
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";

interface ProgressBarProps {
  completed: number;
  total: number;
  width?: number;
}

export function ProgressBar({
  completed,
  total,
  width = 40,
}: ProgressBarProps): React.ReactElement {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const filledWidth = total > 0 ? Math.round((completed / total) * width) : 0;
  const emptyWidth = width - filledWidth;

  const filled = "█".repeat(filledWidth);
  const empty = "░".repeat(emptyWidth);

  return (
    <Box>
      <Text color={colors.success}>{filled}</Text>
      <Text color={colors.dim}>{empty}</Text>
      <Text color={colors.dim}>
        {" "}
        {completed}/{total} ({percentage}%)
      </Text>
    </Box>
  );
}
