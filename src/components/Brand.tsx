/** Original Setwise mark: two stacked strokes joined into a geometric S. */
export function SetwiseMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 34"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M27 3H10L4 9V15L22 21V24H4V30H22L28 24V18L10 12V9H27Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <SetwiseMark />
      <span>setwise</span>
    </div>
  );
}
