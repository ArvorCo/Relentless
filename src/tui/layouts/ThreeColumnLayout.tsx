/**
 * ThreeColumnLayout Component
 *
 * mIRC-inspired 3-column layout with Tasks | Output | Queue
 */

import React from "react";
import { Box } from "ink";
import type { LayoutMode } from "../types.js";

interface ThreeColumnLayoutProps {
  /** Left panel content (Tasks) */
  leftPanel: React.ReactNode;
  /** Center panel content (Output) */
  centerPanel: React.ReactNode;
  /** Right panel content (Queue) */
  rightPanel: React.ReactNode;
  /** Bottom content (Status bar) */
  statusBar: React.ReactNode;
  /** Layout mode determines column widths */
  mode: LayoutMode;
  /** Terminal height for calculating panel heights */
  height: number;
}

/**
 * Get width percentages based on layout mode
 */
function getWidths(mode: LayoutMode): { left: string; center: string; right: string } {
  switch (mode) {
    case "three-column":
      return { left: "25%", center: "50%", right: "25%" };
    case "compressed":
      return { left: "20%", center: "60%", right: "20%" };
    default:
      return { left: "100%", center: "100%", right: "100%" };
  }
}

export function ThreeColumnLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  statusBar,
  mode,
  height,
}: ThreeColumnLayoutProps): React.ReactElement {
  const widths = getWidths(mode);

  // Calculate available height for panels (reserve 1 line for status bar)
  const panelHeight = Math.max(10, height - 2);

  return (
    <Box flexDirection="column" width="100%" height={height}>
      {/* Main content area - 3 columns */}
      <Box flexDirection="row" width="100%" height={panelHeight}>
        {/* Left panel - Tasks */}
        <Box
          width={widths.left}
          height="100%"
          flexDirection="column"
          borderStyle="single"
          borderColor="cyan"
        >
          {leftPanel}
        </Box>

        {/* Center panel - Output */}
        <Box
          width={widths.center}
          height="100%"
          flexDirection="column"
          borderStyle="single"
          borderColor="white"
        >
          {centerPanel}
        </Box>

        {/* Right panel - Queue */}
        <Box
          width={widths.right}
          height="100%"
          flexDirection="column"
          borderStyle="single"
          borderColor="magenta"
        >
          {rightPanel}
        </Box>
      </Box>

      {/* Status bar */}
      <Box width="100%" height={1}>
        {statusBar}
      </Box>
    </Box>
  );
}
