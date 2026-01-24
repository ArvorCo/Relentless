/**
 * LayoutSwitcher Component
 *
 * Automatically switches between 3-column and vertical layouts
 * based on terminal size
 */

import React from "react";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout.js";
import { ThreeColumnLayout } from "./ThreeColumnLayout.js";
import { VerticalLayout } from "./VerticalLayout.js";
import type { LayoutMode } from "../types.js";

interface LayoutSwitcherProps {
  /** Content for left panel (Tasks) in 3-column mode */
  taskPanel: React.ReactNode;
  /** Content for center panel (Output) in 3-column mode */
  outputPanel: React.ReactNode;
  /** Content for right panel (Queue) in 3-column mode */
  queuePanel: React.ReactNode;
  /** Status bar content */
  statusBar: React.ReactNode;

  // Vertical layout specific props
  /** Header content for vertical layout */
  header?: React.ReactNode;
  /** Current story info for vertical layout */
  currentStory?: React.ReactNode;
  /** Story grid for vertical layout */
  storyGrid?: React.ReactNode;
  /** Agent status for vertical layout */
  agentStatus?: React.ReactNode;
  /** Additional controls for vertical layout */
  controls?: React.ReactNode;

  /** Force a specific layout mode (overrides responsive detection) */
  forceMode?: LayoutMode;
  /** Callback when layout mode changes */
  onLayoutChange?: (mode: LayoutMode) => void;
}

export function LayoutSwitcher({
  taskPanel,
  outputPanel,
  queuePanel,
  statusBar,
  header,
  currentStory,
  storyGrid,
  agentStatus,
  controls,
  forceMode,
  onLayoutChange,
}: LayoutSwitcherProps): React.ReactElement {
  const layout = useResponsiveLayout();
  const mode = forceMode ?? layout.mode;

  // Notify parent of layout changes
  React.useEffect(() => {
    onLayoutChange?.(mode);
  }, [mode, onLayoutChange]);

  // Use 3-column layout for larger terminals
  if (mode === "three-column" || mode === "compressed") {
    return (
      <ThreeColumnLayout
        leftPanel={taskPanel}
        centerPanel={outputPanel}
        rightPanel={queuePanel}
        statusBar={statusBar}
        mode={mode}
        height={layout.height}
      />
    );
  }

  // Fall back to vertical layout for narrow terminals
  return (
    <VerticalLayout
      header={header ?? null}
      currentStory={currentStory ?? null}
      outputPanel={outputPanel}
      queuePanel={queuePanel}
      storyGrid={storyGrid ?? null}
      agentStatus={agentStatus ?? null}
      statusBar={statusBar}
      controls={controls ?? null}
      height={layout.height}
    />
  );
}

export { useResponsiveLayout } from "../hooks/useResponsiveLayout.js";
export { ThreeColumnLayout } from "./ThreeColumnLayout.js";
export { VerticalLayout } from "./VerticalLayout.js";
