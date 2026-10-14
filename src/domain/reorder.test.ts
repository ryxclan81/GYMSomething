import { describe, expect, it } from "vitest";
import { moveItem } from "./reorder";

describe("stable reorder", () => {
  const a = { id: "a", sets: [{ id: "logged-a", completed: true }] };
  const b = { id: "b", sets: [{ id: "logged-b", completed: false }] };
  const c = { id: "c", sets: [] };
  const input = [a, b, c];
  it("moves in both directions without losing work or changing object identities", () => {
    const down = moveItem(input, 0, 2);
    expect(down.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(down[2]).toBe(a);
    expect(down[2].sets[0].completed).toBe(true);
    expect(moveItem(down, 2, 0)).toEqual(input);
    expect(input.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
  it("ignores out-of-range, fractional, and non-finite destinations", () => {
    for (const [from, to] of [
      [-1, 1],
      [0, 3],
      [0, 0.5],
      [NaN, 1],
      [0, Infinity],
    ])
      expect(moveItem(input, from, to)).toEqual(input);
    expect(moveItem([], 0, 1)).toEqual([]);
  });
});
