import { NO_EQUIPMENT } from "./equipmentSelection";

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function distance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );
  for (let i = 0; i <= left.length; i++) rows[i][0] = i;
  for (let j = 0; j <= right.length; j++) rows[0][j] = j;
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + Number(left[i - 1] !== right[j - 1]),
      );
      if (
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      )
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[left.length][right.length];
}

/** Keep the bodyweight choice available while filtering real equipment names. */
export function filterEquipment(
  choices: readonly string[],
  query: string,
): string[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return [...choices];
  return choices.filter((item) => {
    if (item === NO_EQUIPMENT) return true;
    const name = normalize(item);
    const tokens = name.split(" ");
    return words.every((word) => {
      if (name.includes(word)) return true;
      if (word.length < 4) return false;
      const allowance = word.length >= 6 ? 2 : 1;
      return tokens.some((token) => {
        const prefix = token.slice(0, word.length);
        return (
          (Math.abs(token.length - word.length) <= allowance &&
            distance(word, token) <= allowance) ||
          distance(word, prefix) <= allowance
        );
      });
    });
  });
}
