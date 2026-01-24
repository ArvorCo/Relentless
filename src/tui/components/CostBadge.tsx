/**
 * CostBadge Component
 *
 * Real-time cost display with actual vs estimated
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import { formatCost } from "../hooks/useCostTracking.js";

interface CostBadgeProps {
  /** Actual cost incurred */
  actual: number;
  /** Estimated total cost */
  estimated?: number;
  /** Whether to show compact view */
  compact?: boolean;
}

/**
 * Get cost color based on amount
 */
function getCostColor(cost: number): string {
  if (cost === 0) return colors.cost.free;
  if (cost < 0.10) return colors.cost.cheap;
  if (cost < 1.00) return colors.cost.medium;
  return colors.cost.expensive;
}

export function CostBadge({
  actual,
  estimated,
  compact = false,
}: CostBadgeProps): React.ReactElement {
  const actualFormatted = formatCost(actual);
  const costColor = getCostColor(actual);

  if (compact) {
    return (
      <Text color={costColor} bold>
        {actualFormatted}
      </Text>
    );
  }

  return (
    <Box>
      <Text color={costColor} bold>
        {actualFormatted}
      </Text>
      {estimated !== undefined && estimated > 0 && (
        <Text color={colors.dim}>
          {" "}(~{formatCost(estimated)} est)
        </Text>
      )}
    </Box>
  );
}
