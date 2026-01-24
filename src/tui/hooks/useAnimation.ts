/**
 * useAnimation Hook
 *
 * Provides animation effects for the TUI components
 */

import { useState, useEffect } from "react";

export interface AnimationOptions {
  /** Animation interval in milliseconds */
  interval?: number;
  /** Whether animation is active */
  active?: boolean;
}

/**
 * Pulse animation frames for active task indicator
 */
export const PULSE_FRAMES = [">", ">>", ">>>", ">>", ">"] as const;

/**
 * Spinner frames for loading states
 */
export const SPINNER_FRAMES = ["|", "/", "-", "\\"] as const;

/**
 * Hook for cycling through animation frames
 */
export function useFrameAnimation<T extends readonly string[]>(
  frames: T,
  options: AnimationOptions = {}
): T[number] {
  const { interval = 200, active = true } = options;
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setFrameIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, interval);

    return () => clearInterval(timer);
  }, [active, interval, frames.length]);

  return frames[frameIndex];
}

/**
 * Hook for pulse animation on active tasks
 */
export function usePulse(active: boolean = true): string {
  return useFrameAnimation(PULSE_FRAMES, { active, interval: 300 });
}

/**
 * Hook for typing animation effect
 */
export function useTypingEffect(
  text: string,
  options: { speed?: number; active?: boolean } = {}
): { displayText: string; isTyping: boolean } {
  const { speed = 30, active = true } = options;
  const [displayLength, setDisplayLength] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplayLength(text.length);
      setIsTyping(false);
      return;
    }

    if (displayLength >= text.length) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const timer = setTimeout(() => {
      setDisplayLength((prev) => Math.min(prev + 1, text.length));
    }, speed);

    return () => clearTimeout(timer);
  }, [active, displayLength, text.length, speed]);

  // Reset when text changes
  useEffect(() => {
    setDisplayLength(0);
    if (active) {
      setIsTyping(true);
    }
  }, [text, active]);

  return {
    displayText: text.slice(0, displayLength),
    isTyping,
  };
}

/**
 * Hook for blinking cursor effect
 */
export function useBlinkingCursor(active: boolean = true): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const timer = setInterval(() => {
      setVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(timer);
  }, [active]);

  return visible;
}

/**
 * Hook for smooth number transitions
 */
export function useAnimatedNumber(
  target: number,
  options: { duration?: number; active?: boolean } = {}
): number {
  const { duration = 500, active = true } = options;
  const [current, setCurrent] = useState(target);

  useEffect(() => {
    if (!active) {
      setCurrent(target);
      return;
    }

    const startValue = current;
    const startTime = Date.now();
    const diff = target - startValue;

    if (diff === 0) return;

    let animationTimer: ReturnType<typeof setTimeout>;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);

      const newValue = startValue + diff * eased;
      setCurrent(Math.round(newValue * 100) / 100);

      if (progress < 1) {
        animationTimer = setTimeout(animate, 16); // ~60fps
      } else {
        setCurrent(target);
      }
    };

    animationTimer = setTimeout(animate, 16);

    return () => clearTimeout(animationTimer);
  }, [target, duration, active]);

  return current;
}

/**
 * Hook for countdown timer display
 */
export function useCountdown(
  targetTime: Date | undefined,
  active: boolean = true
): { minutes: number; seconds: number; display: string } | null {
  const [remaining, setRemaining] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!active || !targetTime) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const now = Date.now();
      const target = targetTime.getTime();
      const diff = Math.max(0, target - now);

      if (diff === 0) {
        setRemaining(null);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setRemaining({ minutes, seconds });
    };

    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [targetTime, active]);

  if (!remaining) return null;

  const display = remaining.minutes > 0
    ? `${remaining.minutes}m`
    : `${remaining.seconds}s`;

  return { ...remaining, display };
}
