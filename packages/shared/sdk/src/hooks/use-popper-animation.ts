import { useState, useEffect, useRef, useMemo } from 'react';
import type { Placement } from '@floating-ui/dom';

interface UsePopperAnimationOptions {
  stableThreshold?: number;
  offset?: number;
  animationDuration?: number;
  easing?: string;
  enabled?: boolean;
}

interface UsePopperAnimationReturn {
  finalStyles: React.CSSProperties;
  animationPhase: 'offset' | 'animating';
  isStable: boolean;
}

// Parse transform to get coordinates
const parseTransform = (transform: string) => {
  const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
  return match
    ? { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) }
    : { x: 0, y: 0 };
};

// Calculate offset transform based on placement
const getOffsetTransform = (transform: string, placement: Placement, offset = 20) => {
  const { x, y } = parseTransform(transform);

  let offsetX = x;
  let offsetY = y;

  if (placement.startsWith('bottom')) {
    offsetY = y + offset; // Offset downward
  } else if (placement.startsWith('top')) {
    offsetY = y - offset; // Offset upward
  } else if (placement.startsWith('left')) {
    offsetX = x - offset; // Offset leftward
  } else if (placement.startsWith('right')) {
    offsetX = x + offset; // Offset rightward
  }

  return `translate(${offsetX}px, ${offsetY}px)`;
};

export const usePopperAnimation = (
  floatingStyles: React.CSSProperties,
  placement: Placement,
  options: UsePopperAnimationOptions = {},
): UsePopperAnimationReturn => {
  const {
    stableThreshold = 250,
    offset = 20,
    animationDuration = 500,
    easing = 'cubic-bezier(0.25, 0.8, 0.5, 1)',
    enabled = true,
  } = options;

  // 'offset'   – initial state: tooltip at offset position, no transition
  // 'animating'– fly-in in progress: tooltip at correct position with CSS transition
  // 'done'     – fly-in complete: no CSS transition so real-time tracking has zero lag
  const [animationPhase, setAnimationPhase] = useState<'offset' | 'animating' | 'done'>('offset');
  const stableTimerRef = useRef<NodeJS.Timeout>();
  const doneTimerRef = useRef<NodeJS.Timeout>();

  // Reset animation phase when placement changes (tooltip flipped sides → replay fly-in)
  useEffect(() => {
    setAnimationPhase('offset');

    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
      stableTimerRef.current = undefined;
    }
    if (doneTimerRef.current) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = undefined;
    }
  }, [placement]);

  // Start the stability timer exactly once when the first transform arrives.
  // Do NOT reset it on subsequent position changes — resetting caused the timer
  // to never fire while the page was being scrolled, leaving the tooltip stuck
  // at the offset position indefinitely.
  useEffect(() => {
    if (!enabled) return;

    const currentTransform = floatingStyles.transform as string;
    if (!currentTransform || animationPhase !== 'offset' || stableTimerRef.current) return;

    stableTimerRef.current = setTimeout(() => {
      stableTimerRef.current = undefined;
      setAnimationPhase('animating');
    }, stableThreshold);

    return () => {
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = undefined;
      }
    };
  }, [floatingStyles.transform, animationPhase, stableThreshold, enabled]);

  // Once the fly-in CSS transition finishes, switch to 'done' so that real-time
  // position updates (from floating-ui's RAF loop during scroll) are applied
  // instantly instead of being smoothed over animationDuration ms.
  useEffect(() => {
    if (!enabled || animationPhase !== 'animating') return;

    doneTimerRef.current = setTimeout(() => {
      doneTimerRef.current = undefined;
      setAnimationPhase('done');
    }, animationDuration);

    return () => {
      if (doneTimerRef.current) {
        clearTimeout(doneTimerRef.current);
        doneTimerRef.current = undefined;
      }
    };
  }, [animationPhase, animationDuration, enabled]);

  // Calculate final styles based on animation phase
  const finalStyles = useMemo(() => {
    if (!enabled) {
      return floatingStyles;
    }

    if (animationPhase === 'offset') {
      // Starting position for fly-in — offset away from target, no transition
      return {
        ...floatingStyles,
        transform: floatingStyles.transform
          ? getOffsetTransform(floatingStyles.transform as string, placement, offset)
          : floatingStyles.transform,
        transition: 'none',
      };
    }

    if (animationPhase === 'animating') {
      // Fly-in: animate from offset position to correct position
      return {
        ...floatingStyles,
        transition: `opacity 250ms linear, transform ${animationDuration}ms ${easing}`,
      };
    }

    // 'done': fly-in complete — track target with zero lag, no CSS transition on transform
    return {
      ...floatingStyles,
      transition: 'none',
    };
  }, [floatingStyles, placement, animationPhase, offset, animationDuration, easing, enabled]);

  return {
    finalStyles,
    // Expose 'animating' for 'done' phase too so callers see consistent API
    animationPhase: animationPhase === 'offset' ? 'offset' : 'animating',
    isStable: enabled ? animationPhase !== 'offset' : true,
  };
};
