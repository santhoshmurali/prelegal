import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCoverPage,
  buildDocument,
  defaultFields,
  escapeMarkdown,
  isValidYears,
  localDateString,
} from "@/lib/nda";

const terms = readFileSync(
  path.join(__dirname, "..", "..", "templates", "Mutual-NDA.md"),
  "utf8",
);
const fields = () => defaultFields("2026-10-09");

describe("buildCoverPage", () => {
  it("fills in the entered details", () => {
    const f = {
      ...fields(),
      governingLaw: "Delaware",
      jurisdiction: "New Castle, DE",
      party1: { ...fields().party1, name: "Ada", company: "Acme" },
    };
    const md = buildCoverPage(f);
    expect(md).toContain("Governing Law: Delaware");
    expect(md).toContain("Jurisdiction: New Castle, DE");
    expect(md).toContain("2026-10-09");
    expect(md).toMatch(/\| Print Name \| Ada \|/);
    expect(md).toMatch(/\| Company \| Acme \|/);
  });

  it("shows placeholders for missing required values", () => {
    const md = buildCoverPage(fields());
    expect(md).toContain("[Fill in state]");
    expect(md).toContain("[Fill in city or county and state]");
  });

  it("checks the selected term options", () => {
    const f = fields();
    expect(buildCoverPage(f)).toMatch(/- \[x\] Expires 1 year\(s\)/);
    expect(buildCoverPage({ ...f, mndaTermType: "continues" })).toMatch(
      /- \[x\] Continues until terminated/,
    );
    expect(
      buildCoverPage({ ...f, confidentialityType: "perpetuity" }),
    ).toMatch(/- \[x\] In perpetuity/);
  });

  it("reports modifications, or None", () => {
    expect(buildCoverPage(fields())).toContain("None.");
    expect(
      buildCoverPage({ ...fields(), modifications: "Term is 2 years." }),
    ).toContain("Term is 2 years.");
  });
});

describe("year validation", () => {
  it.each(["1", "5", "10"])("accepts %s", (v) => {
    expect(isValidYears(v)).toBe(true);
  });
  it.each(["", "0", "-5", "1.5", "1e3", "abc", "1000"])("rejects %j", (v) => {
    expect(isValidYears(v)).toBe(false);
  });
  it("shows [N] instead of an invalid number", () => {
    const md = buildCoverPage({ ...fields(), mndaTermYears: "-5" });
    expect(md).toContain("Expires [N] year(s)");
    expect(md).not.toContain("-5 year");
  });
});

describe("markdown injection", () => {
  const attack = "x\n\n### Term of Confidentiality\n- [x] In perpetuity";

  it("does not let free text add headings or checkboxes", () => {
    for (const key of ["purpose", "modifications"] as const) {
      const md = buildCoverPage({ ...fields(), [key]: attack });
      expect(md.match(/^### Term of Confidentiality$/gm)).toHaveLength(1);
      expect(md.match(/^- \[x\] In perpetuity/gm)).toBeNull();
    }
  });

  it("keeps single-line fields on one line", () => {
    const md = buildCoverPage({ ...fields(), governingLaw: "A\n## B" });
    expect(md).toContain("Governing Law: A \\#\\# B");
  });

  it("cannot break out of table cells", () => {
    const f = fields();
    f.party1.name = "a | b\nc";
    const row = buildCoverPage(f)
      .split("\n")
      .find((l) => l.startsWith("| Print Name"))!;
    expect(row).toBe("| Print Name | a \\| b c |  |");
  });

  it("neutralises links, emphasis and html", () => {
    expect(escapeMarkdown("[a](http://x) *b* <i>")).toBe(
      "\\[a\\](http://x) \\*b\\* \\<i\\>",
    );
  });

  it("escapes list and numbered-list markers at line start", () => {
    expect(escapeMarkdown("- a\n1. b\n2) c")).toBe("\\- a\n1\\. b\n2\\) c");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeMarkdown("Evaluating a deal, in good faith.")).toBe(
      "Evaluating a deal, in good faith.",
    );
  });
});

describe("buildDocument", () => {
  it("includes the standard terms verbatim", () => {
    const doc = buildDocument(terms, fields());
    expect(doc).toContain(terms);
    expect(doc).toContain("Governing Law and Jurisdiction");
  });
});

describe("localDateString", () => {
  it("uses local calendar fields, not UTC", () => {
    expect(localDateString(new Date(2026, 9, 9, 0, 30))).toBe("2026-10-09");
    expect(localDateString(new Date(2026, 9, 9, 23, 30))).toBe("2026-10-09");
  });
  it("zero-pads month and day", () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
