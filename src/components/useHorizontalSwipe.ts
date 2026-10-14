import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
  type CSSProperties,
} from "react";

export function useHorizontalSwipe({
  onPrevious,
  onNext,
}: {
  onPrevious: () => void;
  onNext: () => void;
}) {
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressed = useRef(false);
  const pending = useRef<number | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = container;
    const consumeSwipe = (event: TouchEvent) => {
      const start = gesture.current;
      if (!start || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.x,
        dy = touch.clientY - start.y;
      // Consume our horizontal gesture so the browser doesn't treat the next
      // button tap as a stop-scrolling tap. Vertical scrolling stays native.
      if (
        Math.abs(dx) > 16 &&
        Math.abs(dx) > Math.abs(dy) * 1.4 &&
        event.cancelable
      )
        event.preventDefault();
    };
    element?.addEventListener("touchmove", consumeSwipe, { passive: false });
    return () => {
      element?.removeEventListener("touchmove", consumeSwipe);
      if (pending.current !== null) cancelAnimationFrame(pending.current);
    };
  }, [container]);
  const reset = () => {
    gesture.current = null;
  };
  return {
    ref: setContainer,
    style: { touchAction: "pan-y pinch-zoom" } as CSSProperties,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      suppressed.current = false;
      if (
        !event.isPrimary ||
        event.button !== 0 ||
        (event.target as Element).closest(
          "[data-drag-handle],input,select,textarea",
        )
      )
        return;
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x,
        dy = event.clientY - start.y;
      if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx)) {
        reset();
        return;
      }
      if (
        Math.abs(dx) > 16 &&
        Math.abs(dx) > Math.abs(dy) * 1.4 &&
        !event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = gesture.current;
      reset();
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x,
        dy = event.clientY - start.y;
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        suppressed.current = true;
        // Keep the touched day in the DOM through the following touchend.
        // Removing it during pointerup can make browsers swallow the next tap.
        pending.current = requestAnimationFrame(() => {
          pending.current = null;
          if (dx < 0) onNext();
          else onPrevious();
        });
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: reset,
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (suppressed.current && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
        suppressed.current = false;
      }
    },
  };
}
