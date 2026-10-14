import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { moveItem } from "../domain/reorder";
import "../reorder-list.css";

type Drag = {
  pointerId: number;
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  target: number;
  moved: boolean;
  button: HTMLButtonElement;
};

function scrollContainer(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const overflow = getComputedStyle(current).overflowY;
    if (
      /(auto|scroll)/.test(overflow) &&
      current.scrollHeight > current.clientHeight
    )
      return current;
    current = current.parentElement;
  }
  return document.scrollingElement as HTMLElement;
}

/** Vertical reordering with touch dragging, tap controls, and keyboard shortcuts. */
export default function ReorderList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  renderItem,
  ariaLabel,
  className = "",
  disabled = false,
}: {
  items: readonly T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const instructionsId = useId();
  const list = useRef<HTMLDivElement>(null);
  const pointer = useRef<Drag | null>(null);
  const animation = useRef<number | null>(null);
  const [preview, setPreview] = useState<{ id: string; target: number } | null>(
    null,
  );
  const [menu, setMenu] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(
    () => () => {
      if (animation.current !== null) cancelAnimationFrame(animation.current);
    },
    [],
  );

  const announce = (item: T, index: number) =>
    setAnnouncement(
      `${getLabel(item)} moved to position ${index + 1} of ${items.length}.`,
    );

  const commit = (itemId: string, target: number) => {
    const from = items.findIndex((item) => getId(item) === itemId);
    if (from < 0 || from === target || target < 0 || target >= items.length)
      return;
    const reordered = moveItem(items, from, target);
    onReorder(reordered);
    announce(items[from], target);
  };

  const stop = () => {
    const drag = pointer.current;
    pointer.current = null;
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    setPreview(null);
    if (drag?.button.hasPointerCapture(drag.pointerId))
      drag.button.releasePointerCapture(drag.pointerId);
  };

  const updateTarget = () => {
    const drag = pointer.current;
    if (!drag || !list.current || !drag.moved) return;
    const rows = Array.from(list.current.children).filter(
      (row): row is HTMLElement =>
        row instanceof HTMLElement && row.hasAttribute("data-reorder-item"),
    );
    let target = drag.target;
    let nearest = Infinity;
    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      const distance = Math.abs(drag.y - (rect.top + rect.height / 2));
      if (distance < nearest) {
        target = index;
        nearest = distance;
      }
    });
    drag.target = target;
    setPreview((previous) =>
      previous?.id === drag.id && previous.target === target
        ? previous
        : { id: drag.id, target },
    );
  };

  const autoScroll = () => {
    const drag = pointer.current;
    if (!drag || !drag.moved) return;
    const container = scrollContainer(drag.button);
    const documentScroll = container === document.scrollingElement;
    const rect = container.getBoundingClientRect();
    const top = documentScroll ? 0 : Math.max(0, rect.top);
    const bottom = documentScroll
      ? window.innerHeight
      : Math.min(window.innerHeight, rect.bottom);
    const edge = Math.min(64, (bottom - top) / 4);
    const velocity =
      drag.y < top + edge
        ? -Math.min(14, (top + edge - drag.y) / 4)
        : drag.y > bottom - edge
          ? Math.min(14, (drag.y - bottom + edge) / 4)
          : 0;
    if (velocity) {
      container.scrollTop += velocity;
      updateTarget();
    }
    animation.current = requestAnimationFrame(autoScroll);
  };

  const begin = (
    event: PointerEvent<HTMLButtonElement>,
    itemId: string,
    index: number,
  ) => {
    if (disabled || items.length < 2 || !event.isPrimary || event.button !== 0)
      return;
    pointer.current = {
      pointerId: event.pointerId,
      id: itemId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      target: index,
      moved: false,
      button: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (
      !drag.moved &&
      Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 6
    ) {
      drag.moved = true;
      setMenu(null);
      animation.current = requestAnimationFrame(autoScroll);
    }
    updateTarget();
  };

  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      commit(drag.id, drag.target);
      // A pointer-generated click follows pointerup, even after a custom drag.
      event.currentTarget.dataset.suppressReorderClick = "true";
      const button = event.currentTarget;
      window.setTimeout(() => delete button.dataset.suppressReorderClick, 0);
    }
    stop();
  };

  const key = (event: KeyboardEvent<HTMLButtonElement>, itemId: string) => {
    const index = items.findIndex((item) => getId(item) === itemId);
    const target = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (target !== undefined) {
      event.preventDefault();
      setMenu(null);
      commit(itemId, target);
    } else if (event.key === "Escape" && (menu === itemId || pointer.current)) {
      event.preventDefault();
      event.stopPropagation();
      stop();
      setMenu(null);
    }
  };

  const from = preview
    ? items.findIndex((item) => getId(item) === preview.id)
    : -1;
  const shown = preview ? moveItem(items, from, preview.target) : [...items];
  return (
    <div className="reorder-list-area">
      <p id={instructionsId} className="visually-hidden">
        Drag the grip to reorder. Tap it for move buttons, or focus it and use
        the up and down arrow keys. Home and End move to the first and last
        positions. Escape cancels a drag.
      </p>
      <div
        ref={list}
        className={`reorder-list ${className}`}
        role="list"
        aria-label={ariaLabel}
      >
        {shown.map((item, index) => {
          const itemId = getId(item);
          const label = getLabel(item);
          const originalIndex = items.findIndex(
            (candidate) => getId(candidate) === itemId,
          );
          const menuId = `${instructionsId}-${encodeURIComponent(itemId)}`;
          const handle = (
            <div
              className="reorder-controls"
              data-help-ignore="true"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setMenu((previous) =>
                    previous === itemId ? null : previous,
                  );
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && menu === itemId) {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenu(null);
                  event.currentTarget
                    .querySelector<HTMLButtonElement>(".reorder-handle")
                    ?.focus();
                }
              }}
            >
              <button
                type="button"
                className="icon-btn reorder-handle"
                data-drag-handle="true"
                aria-label={`Reorder ${label}`}
                aria-describedby={instructionsId}
                aria-expanded={menu === itemId}
                aria-controls={menu === itemId ? menuId : undefined}
                aria-keyshortcuts="ArrowUp ArrowDown Home End"
                disabled={disabled || items.length < 2}
                onPointerDown={(event) => begin(event, itemId, originalIndex)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={stop}
                onLostPointerCapture={() => {
                  if (pointer.current?.id === itemId) stop();
                }}
                onKeyDown={(event) => key(event, itemId)}
                onClick={(event) => {
                  if (event.currentTarget.dataset.suppressReorderClick) {
                    delete event.currentTarget.dataset.suppressReorderClick;
                    return;
                  }
                  setMenu((previous) => (previous === itemId ? null : itemId));
                }}
              >
                <GripVertical size={19} aria-hidden="true" />
              </button>
              {menu === itemId && (
                <div className="reorder-move-menu" id={menuId}>
                  {[
                    ["Move up", originalIndex - 1, ArrowUp],
                    ["Move down", originalIndex + 1, ArrowDown],
                    ["Move to first", 0, ArrowUp],
                    ["Move to last", items.length - 1, ArrowDown],
                  ].map(([text, target, Icon]) => {
                    const destination = target as number;
                    const Glyph = Icon as typeof ArrowUp;
                    return (
                      <button
                        type="button"
                        key={text as string}
                        aria-label={`${text} ${label}`}
                        disabled={
                          destination < 0 ||
                          destination >= items.length ||
                          destination === originalIndex
                        }
                        onClick={() => {
                          commit(itemId, destination);
                          setMenu(null);
                          list.current
                            ?.querySelector<HTMLElement>(
                              `[data-reorder-item="${CSS.escape(itemId)}"] .reorder-handle`,
                            )
                            ?.focus();
                        }}
                      >
                        <Glyph size={16} aria-hidden="true" />
                        {text as string}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
          return (
            <div
              key={itemId}
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={items.length}
              className={`reorder-item${preview?.id === itemId ? " reorder-item-dragging" : ""}`}
              data-reorder-item={itemId}
            >
              {renderItem(item, index, handle)}
            </div>
          );
        })}
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
