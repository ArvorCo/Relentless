/**
 * useResponsiveLayout Hook
 *
 * Detects terminal size and returns the appropriate layout mode
 */

import { useState, useEffect } from "react";
import { useStdout } from "ink";

export type LayoutMode = "three-column" | "compressed" | "vertical";

export interface LayoutDimensions {
  /** Terminal width in columns */
  width: number;
  /** Terminal height in rows */
  height: number;
  /** Current layout mode */
  mode: LayoutMode;
  /** Left panel width (percentage or fixed) */
  leftWidth: string;
  /** Center panel width (percentage or fixed) */
  centerWidth: string;
  /** Right panel width (percentage or fixed) */
  rightWidth: string;
}

/** Breakpoints for layout switching */
export const LAYOUT_BREAKPOINTS = {
  /** Full 3-column layout (25%/50%/25%) */
  FULL_THREE_COLUMN: 120,
  /** Compressed 3-column layout (20%/60%/20%) */
  COMPRESSED_THREE_COLUMN: 100,
  /** Below this, use vertical layout */
  VERTICAL: 100,
} as const;

/**
 * Hook that provides responsive layout dimensions based on terminal size
 */
export function useResponsiveLayout(): LayoutDimensions {
  const { stdout } = useStdout();

  const getLayoutDimensions = (): LayoutDimensions => {
    const width = stdout?.columns ?? 80;
    const height = stdout?.rows ?? 24;

    if (width >= LAYOUT_BREAKPOINTS.FULL_THREE_COLUMN) {
      return {
        width,
        height,
        mode: "three-column",
        leftWidth: "25%",
        centerWidth: "50%",
        rightWidth: "25%",
      };
    } else if (width >= LAYOUT_BREAKPOINTS.COMPRESSED_THREE_COLUMN) {
      return {
        width,
        height,
        mode: "compressed",
        leftWidth: "20%",
        centerWidth: "60%",
        rightWidth: "20%",
      };
    } else {
      return {
        width,
        height,
        mode: "vertical",
        leftWidth: "100%",
        centerWidth: "100%",
        rightWidth: "100%",
      };
    }
  };

  const [dimensions, setDimensions] = useState<LayoutDimensions>(getLayoutDimensions);

  useEffect(() => {
    const handleResize = () => {
      setDimensions(getLayoutDimensions());
    };

    // Listen for terminal resize events
    if (stdout) {
      stdout.on("resize", handleResize);
      return () => {
        stdout.off("resize", handleResize);
      };
    }
  }, [stdout]);

  return dimensions;
}
