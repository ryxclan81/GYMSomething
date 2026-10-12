import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import {
  describeHelpControl,
  helpTopics,
  type HelpControlKind,
  type HelpDescription,
  type HelpTopic,
} from "../data/help";

const CONTROL_SELECTOR =
  'button,input:not([type="hidden"]),select,textarea,a[href],summary,[role="button"],[role="checkbox"],[role="switch"],[role="combobox"],[role="tab"],[role="option"],[data-help-topic]';
const CHROME_SELECTOR = "[data-help-ignore],[data-help-chrome]";

function elementFromTarget(target: EventTarget | null) {
  return target instanceof Element
    ? target
    : target instanceof Node
      ? target.parentElement
      : null;
}

function controlFromTarget(target: EventTarget | null): HTMLElement | null {
  const element = elementFromTarget(target);
  if (!element || element.closest(CHROME_SELECTOR)) return null;
  const direct = element.closest<HTMLElement>(CONTROL_SELECTOR);
  if (direct) return direct;
  // Clicking the label of a native checkbox also activates that checkbox.
  const label = element.closest("label");
  return (
    label?.control ??
    label?.querySelector<HTMLElement>(CONTROL_SELECTOR) ??
    null
  );
}

function labelledText(element: HTMLElement): string {
  const direct =
    element.dataset.helpLabel || element.getAttribute("aria-label");
  if (direct) return direct;
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }
  const labels = (element as HTMLInputElement).labels;
  const label = labels?.[0] ?? element.closest("label");
  if (label) {
    const named = label.querySelector("strong");
    if (named?.textContent?.trim()) return named.textContent.trim();
    const copy = label.cloneNode(true) as HTMLElement;
    copy
      .querySelectorAll(`${CONTROL_SELECTOR},${CHROME_SELECTOR},svg`)
      .forEach((node) => node.remove());
    if (copy.textContent?.trim()) return copy.textContent.trim();
  }
  const fieldLabel = element
    .closest(".field")
    ?.querySelector("label,[data-field-label]");
  return (
    fieldLabel?.textContent?.trim() ||
    element.textContent?.trim() ||
    element.getAttribute("placeholder") ||
    element.getAttribute("name") ||
    "This control"
  );
}

function controlKind(element: HTMLElement): HelpControlKind {
  const role = element.getAttribute("role");
  if (role === "combobox" || element.tagName === "SELECT") return "choice";
  if (role === "option") return "option";
  if (role === "switch" || role === "checkbox") return "toggle";
  if (element.tagName === "INPUT") {
    if (
      ["numeric", "decimal"].includes((element as HTMLInputElement).inputMode)
    )
      return "number";
    switch ((element as HTMLInputElement).type) {
      case "checkbox":
      case "radio":
        return "toggle";
      case "number":
      case "range":
        return "number";
      case "date":
        return "date";
      case "time":
        return "time";
      case "file":
        return "file";
      default:
        return "text";
    }
  }
  if (element.tagName === "TEXTAREA") return "text";
  if (element.tagName === "A") return "link";
  if (element.tagName === "SUMMARY") return "disclosure";
  if (element.tagName === "BUTTON" || role === "button" || role === "tab")
    return "button";
  return "term";
}

function elementContext(element: HTMLElement) {
  return (
    element.closest("dialog")?.getAttribute("aria-label") ||
    element.closest(".page")?.querySelector("h1")?.textContent ||
    ""
  );
}

interface ShowOptions {
  topic?: string;
  label?: string;
  description?: string;
  kind?: HelpControlKind;
  pinned?: boolean;
}
interface ActiveHelp {
  source: HTMLElement;
  host: HTMLElement;
  description: HelpDescription;
  pinned: boolean;
}
interface HelpContextValue {
  explaining: boolean;
  setExplaining: (enabled: boolean) => void;
  toggleHelp: (source?: HTMLElement) => void;
  showHelp: (source: HTMLElement, options?: ShowOptions) => void;
  dismissHelp: (restoreFocus?: boolean) => void;
}
const HelpContext = createContext<HelpContextValue | null>(null);

/** For custom controls; ordinary controls are covered by delegated listeners. */
export function useHelp() {
  return useContext(HelpContext);
}

function removeDescription(element: HTMLElement, descriptionId: string) {
  const remaining = (element.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter((value) => value && value !== descriptionId);
  if (remaining.length)
    element.setAttribute("aria-describedby", remaining.join(" "));
  else element.removeAttribute("aria-describedby");
}

function block(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function HelpProvider({ children }: { children: ReactNode }) {
  const tooltipId = `setwise-help-${useId().replace(/:/g, "")}`;
  const [explaining, setMode] = useState(false);
  const [active, setActive] = useState<ActiveHelp | null>(null);
  const activeRef = useRef<ActiveHelp | null>(null);
  const modeRef = useRef(false);
  const keyboardRef = useRef(false);
  const suppressFocus = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  }, []);

  const dismissHelp = useCallback(
    (restoreFocus = false) => {
      cancelClose();
      const current = activeRef.current;
      if (current) removeDescription(current.source, tooltipId);
      activeRef.current = null;
      setActive(null);
      if (
        restoreFocus &&
        current?.source.isConnected &&
        document.activeElement !== current.source
      ) {
        suppressFocus.current = current.source;
        current.source.focus({ preventScroll: true });
      }
    },
    [cancelClose, tooltipId],
  );

  const showHelp = useCallback(
    (source: HTMLElement, options: ShowOptions = {}) => {
      cancelClose();
      const previous = activeRef.current;
      if (previous) removeDescription(previous.source, tooltipId);
      const annotated = source.closest<HTMLElement>(
        "[data-help-topic],[data-help]",
      );
      const description = describeHelpControl({
        label: options.label ?? labelledText(source),
        kind: options.kind ?? controlKind(source),
        context: elementContext(source),
        topic: options.topic ?? annotated?.dataset.helpTopic,
        description: options.description ?? annotated?.dataset.help,
        disabled: source.matches(":disabled,[aria-disabled='true']"),
      });
      const nearby = source
        .closest("label,.field,.list-row")
        ?.querySelector("p,small");
      const hint = nearby?.textContent?.trim();
      if (
        !options.description &&
        !annotated?.dataset.help &&
        hint &&
        hint.length > 15 &&
        !description.body.toLowerCase().includes(hint.toLowerCase())
      )
        description.body += `\n\n${hint}`;
      const next: ActiveHelp = {
        source,
        host:
          source.closest<HTMLDialogElement>("dialog[open]") ?? document.body,
        description,
        pinned: options.pinned ?? modeRef.current,
      };
      const ids = new Set(
        (source.getAttribute("aria-describedby") ?? "")
          .split(/\s+/)
          .filter(Boolean),
      );
      ids.add(tooltipId);
      source.setAttribute("aria-describedby", [...ids].join(" "));
      activeRef.current = next;
      setActive(next);
    },
    [cancelClose, tooltipId],
  );

  const setExplaining = useCallback(
    (enabled: boolean) => {
      modeRef.current = enabled;
      setMode(enabled);
      if (!enabled) dismissHelp();
    },
    [dismissHelp],
  );

  const toggleHelp = useCallback(
    (source?: HTMLElement) => {
      const next = !modeRef.current;
      setExplaining(next);
      if (next && source) showHelp(source, { topic: "help", pinned: true });
    },
    [setExplaining, showHelp],
  );

  useEffect(() => {
    const scheduleClose = () => {
      cancelClose();
      closeTimer.current = setTimeout(() => {
        if (!activeRef.current?.pinned) dismissHelp();
      }, 150);
    };
    const onPointerDown = (event: PointerEvent) => {
      keyboardRef.current = false;
      const control = controlFromTarget(event.target);
      if (modeRef.current && control) {
        block(event);
        showHelp(control, { pinned: true });
      } else if (control && !activeRef.current?.pinned) {
        // A normal touch/mouse field interaction should leave space for typing.
        dismissHelp();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!modeRef.current) return;
      const control = controlFromTarget(event.target);
      if (control) {
        block(event);
        showHelp(control, { pinned: true });
      }
    };
    const onPointerOver = (event: PointerEvent) => {
      if (modeRef.current || event.pointerType !== "mouse") return;
      const control = controlFromTarget(event.target);
      if (
        !control ||
        (event.relatedTarget instanceof Node &&
          control.contains(event.relatedTarget))
      )
        return;
      if (!activeRef.current?.pinned) showHelp(control, { pinned: false });
    };
    const onPointerOut = (event: PointerEvent) => {
      const current = activeRef.current;
      if (!current || current.pinned) return;
      if (
        event.relatedTarget instanceof Node &&
        (current.source.contains(event.relatedTarget) ||
          cardRef.current?.contains(event.relatedTarget))
      )
        return;
      if (
        elementFromTarget(event.target) &&
        current.source.contains(elementFromTarget(event.target))
      )
        scheduleClose();
    };
    const onFocus = (event: FocusEvent) => {
      const control = controlFromTarget(event.target);
      if (!control) return;
      if (suppressFocus.current === control) {
        suppressFocus.current = null;
        return;
      }
      if (modeRef.current || keyboardRef.current) showHelp(control);
    };
    const onBlur = (event: FocusEvent) => {
      if (
        activeRef.current?.source === event.target &&
        !activeRef.current.pinned
      )
        scheduleClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activeRef.current) {
          block(event);
          dismissHelp(true);
        } else if (modeRef.current) {
          block(event);
          setExplaining(false);
        }
        return;
      }
      if (event.key === "Tab") {
        keyboardRef.current = true;
        return;
      }
      const control = controlFromTarget(event.target);
      if (!control) return;
      const editable = control.matches(
        "input,textarea,select,[role='combobox'],[role='option'],[role='checkbox'],[role='switch']",
      );
      if (modeRef.current && (editable || ["Enter", " "].includes(event.key))) {
        block(event);
        showHelp(control, { pinned: true });
      } else if (
        !modeRef.current &&
        editable &&
        !activeRef.current?.pinned &&
        (event.key.length === 1 || ["Backspace", "Delete"].includes(event.key))
      )
        dismissHelp();
    };
    const onEdit = (event: Event) => {
      if (!modeRef.current) return;
      const control = controlFromTarget(event.target);
      if (control) {
        block(event);
        showHelp(control, { pinned: true });
      }
    };
    const onScroll = () => {
      if (!activeRef.current?.pinned) dismissHelp();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onBlur, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("beforeinput", onEdit, true);
    document.addEventListener("paste", onEdit, true);
    document.addEventListener("drop", onEdit, true);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", onBlur, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("beforeinput", onEdit, true);
      document.removeEventListener("paste", onEdit, true);
      document.removeEventListener("drop", onEdit, true);
      document.removeEventListener("scroll", onScroll, true);
      cancelClose();
      if (activeRef.current)
        removeDescription(activeRef.current.source, tooltipId);
    };
  }, [cancelClose, dismissHelp, setExplaining, showHelp, tooltipId]);

  useLayoutEffect(() => {
    if (!active) return;
    const position = () => {
      const card = cardRef.current;
      if (!card || !active.source.isConnected) return;
      const viewport = window.visualViewport;
      const view = {
        left: viewport?.offsetLeft ?? 0,
        top: viewport?.offsetTop ?? 0,
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
      };
      const dialogRect =
        active.host.tagName === "DIALOG"
          ? active.host.getBoundingClientRect()
          : null;
      const left = Math.max(view.left, dialogRect?.left ?? view.left) + 12;
      const top = Math.max(view.top, dialogRect?.top ?? view.top) + 12;
      const right =
        Math.min(
          view.left + view.width,
          dialogRect?.right ?? view.left + view.width,
        ) - 12;
      const bottom =
        Math.min(
          view.top + view.height,
          dialogRect?.bottom ?? view.top + view.height,
        ) - 12;
      const width = Math.min(360, Math.max(160, right - left));
      card.style.width = `${width}px`;
      card.style.maxHeight = `${Math.max(100, bottom - top)}px`;
      const height = card.getBoundingClientRect().height;
      const anchor = active.source.getBoundingClientRect();
      const x = Math.min(Math.max(left, anchor.left), right - width);
      const below = anchor.bottom + 10;
      const y =
        below + height <= bottom
          ? below
          : Math.max(top, anchor.top - height - 10);
      card.style.left = `${x}px`;
      card.style.top = `${Math.min(y, bottom - height)}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    const resize = new ResizeObserver(position);
    if (cardRef.current) resize.observe(cardRef.current);
    const removal = new MutationObserver(() => {
      if (
        !active.source.isConnected ||
        (active.host.tagName === "DIALOG" && !active.host.hasAttribute("open"))
      )
        dismissHelp();
    });
    removal.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      resize.disconnect();
      removal.disconnect();
    };
  }, [active, dismissHelp]);

  const cardStyle: CSSProperties = {
    position: "fixed",
    zIndex: 2147483000,
    width: "min(360px, calc(100vw - 24px))",
    maxHeight: "calc(100dvh - 24px)",
    overflow: "auto",
    background: "var(--surface-2, #1b2029)",
    color: "var(--text, #f1f4fa)",
    border: "1px solid var(--line, #29313e)",
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 12px 36px #0007",
    fontSize: 15,
    lineHeight: 1.55,
  };

  return (
    <HelpContext.Provider
      value={{ explaining, setExplaining, toggleHelp, showHelp, dismissHelp }}
    >
      {children}
      {active &&
        createPortal(
          <div role="region" aria-label="Control help">
            <div
              ref={cardRef}
              id={tooltipId}
              className={`help-popover ${active.pinned ? "help-popover-pinned" : ""}`}
              data-help-chrome="true"
              role={active.pinned ? "dialog" : "tooltip"}
              aria-label={active.pinned ? active.description.title : undefined}
              style={cardStyle}
              onPointerEnter={cancelClose}
              onPointerLeave={() => {
                if (!active.pinned) dismissHelp();
              }}
            >
              <div
                className="help-popover-heading"
                style={{
                  display: "flex",
                  alignItems: "start",
                  gap: 12,
                  justifyContent: "space-between",
                }}
              >
                <strong style={{ fontSize: 16 }}>
                  {active.description.title}
                </strong>
                {active.pinned && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Dismiss explanation"
                    onClick={() => dismissHelp(true)}
                    style={{
                      flexShrink: 0,
                      minWidth: 44,
                      minHeight: 44,
                      marginTop: -10,
                      marginRight: -10,
                    }}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p
                style={{
                  marginTop: 8,
                  lineHeight: 1.55,
                  whiteSpace: "pre-line",
                }}
              >
                {active.description.body}
              </p>
              {active.pinned && (
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      explaining ? setExplaining(false) : dismissHelp(true)
                    }
                    style={{ minHeight: 44, width: "100%" }}
                  >
                    {explaining ? "Exit help mode" : "Got it"}
                  </button>
                </div>
              )}
            </div>
          </div>,
          active.host,
        )}
    </HelpContext.Provider>
  );
}

export function HelpToggle({
  className = "btn secondary",
  compact = false,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  compact?: boolean;
}) {
  const help = useHelp();
  if (!help) return null;
  return (
    <button
      {...props}
      type="button"
      className={`help-toggle ${className}`}
      data-help-ignore="true"
      aria-pressed={help.explaining}
      aria-label={help.explaining ? "Exit help mode" : "Explain controls"}
      onClick={(event) => help.toggleHelp(event.currentTarget)}
    >
      <CircleHelp size={18} aria-hidden="true" />
      {!compact && <span>{help.explaining ? "Exit Help" : "Help"}</span>}
    </button>
  );
}

export function HelpTip({
  topic,
  label,
  description,
  className = "",
}: {
  topic?: HelpTopic;
  label?: string;
  description?: string;
  className?: string;
}) {
  const help = useHelp();
  if (!help) return null;
  const name = label ?? (topic ? helpTopics[topic].title : "this field");
  const show = (element: HTMLButtonElement, pinned: boolean) => {
    const nearby = [
      ...(element
        .closest(".field")
        ?.querySelectorAll<HTMLElement>(CONTROL_SELECTOR) ?? []),
    ].find(
      (candidate) =>
        candidate !== element && !candidate.closest(CHROME_SELECTOR),
    );
    help.showHelp(element, {
      topic,
      label: name,
      description,
      pinned,
      kind: nearby && nearby !== element ? controlKind(nearby) : "term",
    });
  };
  return (
    <button
      type="button"
      className={`help-tip ${className}`}
      data-help-ignore="true"
      aria-label={`Explain ${name}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 44,
        minHeight: 44,
        padding: 8,
        border: 0,
        background: "transparent",
        color: "var(--muted, #a1adbf)",
        borderRadius: 8,
        flexShrink: 0,
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") show(event.currentTarget, false);
      }}
      onFocus={(event) => show(event.currentTarget, false)}
      onClick={(event) => show(event.currentTarget, true)}
    >
      <CircleHelp size={17} aria-hidden="true" />
    </button>
  );
}

export function HelpText({
  topic,
  children,
  className = "",
}: {
  topic: HelpTopic;
  children: ReactNode;
  className?: string;
}) {
  const help = useHelp();
  return (
    <span
      className={`help-term ${className}`}
      data-help-topic={topic}
      role={help ? "button" : undefined}
      aria-label={help ? `Explain ${helpTopics[topic].title}` : undefined}
      tabIndex={help ? 0 : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 44,
        minHeight: 44,
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 4,
        cursor: "help",
      }}
      onClick={(event) =>
        help?.showHelp(event.currentTarget, { topic, pinned: true })
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          help?.showHelp(event.currentTarget, { topic, pinned: true });
        }
      }}
    >
      {children}
    </span>
  );
}
