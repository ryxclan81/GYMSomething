/** Move one existing item without replacing objects, IDs, or saved snapshots. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const copy = [...items];
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    from >= copy.length ||
    to < 0 ||
    to >= copy.length ||
    from === to
  )
    return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
