import { describe, expect, it } from "vitest";
import { applyChanges } from "@/lib/chat";
import { defaultFields } from "@/lib/nda";

describe("applyChanges", () => {
  it("sets the changed top-level fields and keeps the rest", () => {
    const fields = defaultFields("2026-10-11");

    const next = applyChanges(fields, {
      governingLaw: "Delaware",
      mndaTermType: "continues",
      purpose: null,
    });

    expect(next.governingLaw).toBe("Delaware");
    expect(next.mndaTermType).toBe("continues");
    expect(next.purpose).toBe(fields.purpose);
    expect(next.effectiveDate).toBe("2026-10-11");
  });

  it("merges party changes without clearing the other party fields", () => {
    const fields = defaultFields("");
    const withName = applyChanges(fields, {
      party1: { name: "Ada Lovelace", title: null, company: null },
    });

    const next = applyChanges(withName, {
      party1: { company: "Analytical Engines", name: null },
    });

    expect(next.party1.name).toBe("Ada Lovelace");
    expect(next.party1.company).toBe("Analytical Engines");
    expect(next.party2).toEqual(fields.party2);
  });

  it("leaves fields unchanged when every change is null", () => {
    const fields = defaultFields("");

    const next = applyChanges(fields, {
      party1: { name: null, title: null },
      jurisdiction: null,
    });

    expect(next).toEqual(fields);
  });
});
