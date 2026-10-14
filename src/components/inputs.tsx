import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { selectOptionHelp } from "../domain/optionHelp";

type NumericProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "type"
> & {
  value?: number | string;
  type?: "number";
  onValueChange?: (value: number | undefined) => void;
};

/** Keep the text being edited separate from its numeric persisted value. */
export function NumericInput({
  value,
  onChange,
  onValueChange,
  onFocus,
  onBlur,
  step = 1,
  ...props
}: NumericProps) {
  const display = value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(display);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(display);
  }, [display]);
  return (
    <input
      {...props}
      type="number"
      inputMode={props.inputMode ?? (step === 1 ? "numeric" : "decimal")}
      step={step}
      value={draft}
      onFocus={(event) => {
        focused.current = true;
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        setDraft(raw);
        onChange?.(event);
        onValueChange?.(raw.trim() === "" ? undefined : Number(raw));
      }}
      onBlur={(event) => {
        focused.current = false;
        setDraft(display);
        onBlur?.(event);
      }}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}
type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "defaultValue" | "multiple" | "size"
> & {
  value?: string | number;
  defaultValue?: string | number;
  options?: SelectOption[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
};
const EMPTY = "__forma_empty_choice__";
function textContent(value: ReactNode): string {
  return Children.toArray(value)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textContent(child.props.children)
          : "",
    )
    .join("");
}
function collectOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
        "data-help"?: string;
      }>(child)
    )
      return [];
    if (child.type === Fragment || child.type === "optgroup")
      return collectOptions(child.props.children);
    if (child.type !== "option") return [];
    const label = textContent(child.props.children);
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: child.props.disabled,
        description: child.props["data-help"],
      },
    ];
  });
}

/** Styled, keyboard-accessible choices; legacy option/onChange contracts remain supported. */
export function Select({
  children,
  options,
  value,
  defaultValue,
  onChange,
  onValueChange,
  className = "",
  placeholder = "Choose an option",
  disabled,
  required,
  name,
  id,
  ...props
}: SelectProps) {
  const choices = options ?? collectOptions(children);
  const [internalValue, setInternalValue] = useState(
    String(defaultValue ?? choices[0]?.value ?? ""),
  );
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = String(value ?? internalValue);
  const label = props["aria-label"];
  const container = trigger.current?.closest("dialog") ?? undefined;
  const fieldElement = trigger.current?.closest(".field,label");
  const fieldName =
    label ??
    fieldElement
      ?.querySelector("label,[data-field-label]")
      ?.textContent?.trim() ??
    fieldElement?.textContent?.trim() ??
    "";
  return (
    <SelectPrimitive.Root
      value={selected === "" ? EMPTY : selected}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      required={required}
      name={name}
      onValueChange={(encoded) => {
        const next = encoded === EMPTY ? "" : encoded;
        setInternalValue(next);
        const target = { value: next } as HTMLSelectElement;
        onChange?.({
          target,
          currentTarget: target,
          type: "change",
        } as ChangeEvent<HTMLSelectElement>);
        onValueChange?.(next);
      }}
    >
      <SelectPrimitive.Trigger
        ref={trigger}
        id={id}
        className={`forma-select ${className}`}
        aria-label={label}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
        aria-invalid={props["aria-invalid"]}
        title={props.title}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={17} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          className="forma-select-menu"
          position="popper"
          sideOffset={8}
          collisionPadding={16}
        >
          <SelectPrimitive.ScrollUpButton className="forma-select-scroll">
            <ChevronUp size={16} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="forma-select-options">
            {choices.map((option) => {
              const explanation =
                option.description ??
                selectOptionHelp(option.label, option.value, fieldName);
              return (
                <SelectPrimitive.Item
                  className="forma-select-option"
                  data-value={option.value === "" ? EMPTY : option.value}
                  value={option.value === "" ? EMPTY : option.value}
                  key={option.value}
                  disabled={option.disabled}
                  data-help={explanation}
                  data-help-label={option.label}
                  data-help-ignore={explanation ? undefined : "true"}
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={17} aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="forma-select-scroll">
            <ChevronDown size={16} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
