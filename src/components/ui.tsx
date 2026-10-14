import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type ReactElement,
} from "react";
import { X, ArrowLeft } from "lucide-react";
import { HelpTip, HelpButton } from "./Help";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const labelId = useId(),
    hintId = useId();
  const firstControl = Children.toArray(children).find(
    (child) =>
      isValidElement(child) &&
      (typeof child.type !== "string" ||
        ["input", "select", "textarea"].includes(child.type)),
  );
  const controlId = isValidElement<{ id?: string }>(firstControl)
    ? (firstControl.props.id ?? `${labelId}-control`)
    : undefined;
  return (
    <div className="field">
      <div className="field-label">
        {controlId ? (
          <label id={labelId} htmlFor={controlId}>
            {label}
          </label>
        ) : (
          <span id={labelId}>{label}</span>
        )}
        <HelpTip label={label} />
      </div>
      {Children.map(children, (child) => {
        if (
          !isValidElement(child) ||
          (typeof child.type === "string" &&
            !["input", "select", "textarea"].includes(child.type))
        )
          return child;
        return cloneElement(child as ReactElement<Record<string, unknown>>, {
          id: (child.props as { id?: string }).id ?? controlId,
          "aria-labelledby": labelId,
          "aria-describedby": hint ? hintId : undefined,
        });
      })}
      {hint && (
        <small id={hintId} className="muted">
          {hint}
        </small>
      )}
    </div>
  );
}
export function SectionHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">↗</span>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {children}
    </div>
  );
}
export function Sheet({
  title,
  children,
  onClose,
  open = true,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  open?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="sheet-inner">
        <header className="sheet-header">
          <h2>{title}</h2>
          <div className="sheet-header-actions">
            <HelpButton helpTitle={title} compact className="icon-btn" />
            <IconButton label="Close" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </div>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Back({ onClick }: { onClick: () => void }) {
  return (
    <button className="back" onClick={onClick}>
      <ArrowLeft size={18} /> Back
    </button>
  );
}
type ToastMessage = { text: string; id: number };
let toastListener: ((message: ToastMessage) => void) | undefined;
export function toast(text: string) {
  toastListener?.({ text, id: Date.now() });
}
export function Toasts() {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  useEffect(() => {
    toastListener = setMessage;
    return () => {
      toastListener = undefined;
    };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <div
      className={`toast ${message ? "visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {message?.text}
    </div>
  );
}
