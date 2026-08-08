import { describe, expect, it } from "vitest";

import { buildRows, repeatToFill } from "@/lib/utils/testimonial-rows";

/**
 * The reported symptom was "one person appears on every card".
 *
 * It turned out to be the single-record case rendering correctly — with one
 * testimonial there is nothing else to show — but the underlying worry is real
 * and worth pinning: the marquee needs a duplicated track to loop seamlessly,
 * and duplication logic is exactly where a list turns into the same item over
 * and over.
 *
 * So these assert the distinction directly: repetition must repeat the
 * SEQUENCE, never an element, and each row must carry every record it was
 * given, unmodified.
 */

const people = (...names: string[]) => names.map((name, i) => ({ id: `id-${i}`, name }));

describe("repeatToFill", () => {
  it("repeats the whole sequence, not individual items", () => {
    // THE bug this guards: A,B -> A,B,A,B,A,B and never A,A,A,B,B,B.
    const out = repeatToFill(people("A", "B")).map((p) => p.name);
    expect(out).toEqual(["A", "B", "A", "B", "A", "B"]);
  });

  it("never reorders or drops a record", () => {
    const base = people("A", "B", "C", "D");
    const out = repeatToFill(base);
    // Every copy is the original sequence in the original order.
    for (let i = 0; i < out.length; i += base.length) {
      expect(out.slice(i, i + base.length)).toEqual(base);
    }
  });

  it("fills a wide row so the loop has no visible gap", () => {
    // One card is ~336px; fewer than six leaves empty track crossing a desktop.
    expect(repeatToFill(people("A")).length).toBeGreaterThanOrEqual(6);
    expect(repeatToFill(people("A", "B", "C")).length).toBeGreaterThanOrEqual(6);
  });

  it("leaves an already-wide list alone", () => {
    const base = people("A", "B", "C", "D", "E", "F");
    expect(repeatToFill(base)).toEqual(base);
  });

  it("returns nothing for an empty list rather than looping forever", () => {
    expect(repeatToFill([])).toEqual([]);
  });
});

describe("buildRows", () => {
  it("gives every record its own slot — six people yield six distinct names", () => {
    const base = people("Arjun", "Aigerim", "Daniyar", "Madina", "Dias", "Aruzhan");
    const { top, bottom } = buildRows(base);
    const seen = new Set([...top, ...bottom].map((p) => p.name));
    expect(seen).toEqual(new Set(["Arjun", "Aigerim", "Daniyar", "Madina", "Dias", "Aruzhan"]));
  });

  it("splits the two rows so they carry different people once there are four", () => {
    const { top, bottom } = buildRows(people("A", "B", "C", "D"));
    expect(new Set(top.map((p) => p.name))).toEqual(new Set(["A", "B"]));
    expect(new Set(bottom.map((p) => p.name))).toEqual(new Set(["C", "D"]));
  });

  it("puts the whole set in both rows below four, rather than half-empty track", () => {
    const { top, bottom } = buildRows(people("A", "B"));
    expect(new Set(top.map((p) => p.name))).toEqual(new Set(["A", "B"]));
    expect(new Set(bottom.map((p) => p.name))).toEqual(new Set(["A", "B"]));
  });

  it("runs the bottom row in the opposite sequence", () => {
    const { bottom } = buildRows(people("A", "B", "C", "D"));
    // Base for the bottom row is [C, D]; reversed it starts at D.
    expect(bottom[0].name).toBe("D");
  });

  it("never fabricates a record", () => {
    const base = people("A", "B", "C", "D", "E");
    const { top, bottom } = buildRows(base);
    const ids = new Set(base.map((p) => p.id));
    for (const item of [...top, ...bottom]) expect(ids.has(item.id)).toBe(true);
  });

  it("carries one record through unchanged when that is all there is", () => {
    // Explicitly allowed: with a single testimonial the loop can only show it
    // repeatedly, because there is nothing else that is true.
    const { top, bottom } = buildRows(people("Solo"));
    expect(new Set([...top, ...bottom].map((p) => p.name))).toEqual(new Set(["Solo"]));
  });

  it("produces unique React keys once id is paired with its slot", () => {
    // The id alone repeats after repeatToFill; duplicate keys make React reuse
    // the wrong card when the list changes.
    const { top } = buildRows(people("A", "B"));
    const keys = top.map((p, slot) => `${p.id}-${slot}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
