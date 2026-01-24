/**
 * VerticalLayout Component
 *
 * Fallback vertical layout for narrow terminals (<100 cols)
 * Stacks panels vertically similar to current behavior
 */

import React from "react";
import { Box } from "ink";

interface VerticalLayoutProps {
  /** Header content */
  header: React.ReactNode;
  /** Current story info */
  currentStory: React.ReactNode;
  /** Output panel content */
  outputPanel: React.ReactNode;
  /** Queue panel content */
  queuePanel: React.ReactNode;
  /** Story grid content */
  storyGrid: React.ReactNode;
  /** Agent status footer */
  agentStatus: React.ReactNode;
  /** Status bar */
  statusBar: React.ReactNode;
  /** Additional controls (queue input, etc.) */
  controls: React.ReactNode;
  /** Terminal height */
  height: number;
}

export function VerticalLayout({
  header,
  currentStory,
  outputPanel,
  queuePanel,
  storyGrid,
  agentStatus,
  statusBar,
  controls,
}: VerticalLayoutProps): React.ReactElement {
  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      {header}

      {/* Current story info */}
      {currentStory}

      {/* Agent output */}
      {outputPanel}

      {/* Queue panel */}
      {queuePanel}

      {/* Story grid */}
      {storyGrid}

      {/* Agent status */}
      {agentStatus}

      {/* Status bar */}
      {statusBar}

      {/* Controls (queue input, etc.) */}
      {controls}
    </Box>
  );
}
