import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyUpdates, buildPreview, toNdaFields, type DocumentSpec } from "@/lib/documents";

const templatesDir = path.join(__dirname, "..", "..", "templates");
const documents: DocumentSpec[] = JSON.parse(readFileSync(path.join(templatesDir, "documents.json"), "utf8"));
const byId = (id: string) => documents.find((doc) => doc.id === id)!;
const templateText = (doc: DocumentSpec) => readFileSync(path.join(templatesDir, doc.template), "utf8");

describe("applyUpdates", () => {
  it("sets the updated values and keeps the rest", () => {
    expect(applyUpdates({ governingLaw: "Texas", purpose: "Sales" }, { governingLaw: "Delaware" })).toEqual({
      governingLaw: "Delaware",
      purpose: "Sales",
    });
  });
});

describe("toNdaFields", () => {
  it("uses the NDA defaults for fields not yet given", () => {
    const fields = toNdaFields({});

    expect(fields.mndaTermType).toBe("expires");
    expect(fields.mndaTermYears).toBe("1");
    expect(fields.confidentialityType).toBe("years");
    expect(fields.governingLaw).toBe("");
    expect(fields.party1.name).toBe("");
  });

  it("maps flat chat values onto the nested NDA fields", () => {
    const fields = toNdaFields({
      governingLaw: "Delaware",
      mndaTermType: "continues",
      party2Name: "Ada Lovelace",
      party2Company: "Analytical Engines",
    });

    expect(fields.governingLaw).toBe("Delaware");
    expect(fields.mndaTermType).toBe("continues");
    expect(fields.party2.name).toBe("Ada Lovelace");
    expect(fields.party2.company).toBe("Analytical Engines");
  });
});

describe("buildPreview", () => {
  it("renders the Mutual NDA with its own cover page", () => {
    const doc = byId("Mutual-NDA");

    const markdown = buildPreview(doc, templateText(doc), { governingLaw: "Delaware" });

    expect(markdown).toContain("# Mutual Non-Disclosure Agreement");
    expect(markdown).toContain("Governing Law: Delaware");
  });

  it("renders other documents with key details, using placeholders for unknown values", () => {
    const doc = byId("CSA");

    const markdown = buildPreview(doc, templateText(doc), { subscriptionPeriod: "12 months" });

    expect(markdown.match(/^# /gm)).toHaveLength(1);
    expect(markdown).toContain("# Cloud Service Agreement");
    expect(markdown).toContain("- **Subscription period:** 12 months");
    expect(markdown).toContain("- **Fees and payment terms:** [Fees and payment terms]");
  });

  it("escapes user text so it cannot add Markdown structure", () => {
    const doc = byId("sla");

    const markdown = buildPreview(doc, templateText(doc), { remedies: "# Heading" });

    expect(markdown).toContain("- **Remedies for missed targets:** \\# Heading");
  });
});
