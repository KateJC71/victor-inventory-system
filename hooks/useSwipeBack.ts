import { useEffect } from 'react';

interface Options {
  /** Hook is active only when this is true (e.g. when there's something to go back to). */
  enabled?: boolean;
  /** Max distance from the left edge where the swipe must start. */
  edgeWidth?: number;
  /** Min horizontal distance the finger must travel. */
  minDistance?: number;
  /** Max vertical drift allowed before the gesture is rejected (so vertical scroll wins). */
  maxVertical?: number;
}

/**
 * Detect a left-edge → right swipe and call `onBack`.
 *
 * iOS Safari has its own browser-level edge-swipe (history back), but this app
 * uses internal state for navigation, so we add our own gesture. We start
 * detection a bit inside the edge (default 30px) so we don't conflict with the
 * native browser gesture at the very edge of the viewport.
 */
export function useSwipeBack(
  onBack: () => void,
  { enabled = true, edgeWidth = 30, minDistance = 60, maxVertical = 30 }: Options = {}
) {
  useEffect(() => {
    if (!enabled) return;

    let startX = 0;
    let startY = 0;
    let isEdgeStart = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        isEdgeStart = false;
        return;
      }
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isEdgeStart = startX < edgeWidth;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeStart) return;
      isEdgeStart = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      if (dx > minDistance && dy < maxVertical) {
        onBack();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onBack, enabled, edgeWidth, minDistance, maxVertical]);
}
