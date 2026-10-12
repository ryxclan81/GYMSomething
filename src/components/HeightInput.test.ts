import { describe, expect, it } from "vitest";
import { heightFromParts, heightParts } from "./HeightInput";

describe("height measurement conversions", () => {
  it("stores imperial height exactly in centimeters, including zero inches", () => {
    expect(heightFromParts({ feet: 5, inches: 10 })).toBe(177.8);
    expect(heightFromParts({ feet: 6, inches: 0 })).toBe(182.88);
    expect(heightParts(182.88)).toEqual({ feet: 6, inches: 0 });
  });
  it("keeps optional blank measurements absent", () => {
    expect(heightFromParts({})).toBeUndefined();
    expect(heightFromParts({ feet: 0, inches: 0 })).toBeUndefined();
    expect(heightParts(undefined)).toEqual({});
  });
  it("displays centimeters in feet and fractional inches without changing the source", () => {
    expect(heightParts(178)).toEqual({ feet: 5, inches: 10.08 });
    expect(heightParts(152.4)).toEqual({ feet: 5, inches: 0 });
  });
  it("does not publish invalid imperial components", () => {
    expect(heightFromParts({ feet: -1, inches: 10 })).toBeUndefined();
    expect(heightFromParts({ feet: 5.5, inches: 2 })).toBeUndefined();
    expect(heightFromParts({ feet: 5, inches: 12 })).toBeUndefined();
    expect(heightFromParts({ feet: 5, inches: Number.NaN })).toBeUndefined();
  });
});
