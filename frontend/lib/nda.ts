export type PartyFields = {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
  date: string;
};

export type NdaFields = {
  purpose: string;
  effectiveDate: string;
  mndaTermType: "expires" | "continues";
  mndaTermYears: string;
  confidentialityType: "years" | "perpetuity";
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: PartyFields;
  party2: PartyFields;
};

const emptyParty: PartyFields = {
  name: "",
  title: "",
  company: "",
  noticeAddress: "",
  date: "",
};

export function defaultFields(today: string): NdaFields {
  return {
    purpose:
      "Evaluating whether to enter into a business relationship with the other party.",
    effectiveDate: today,
    mndaTermType: "expires",
    mndaTermYears: "1",
    confidentialityType: "years",
    confidentialityYears: "1",
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
    party1: { ...emptyParty },
    party2: { ...emptyParty },
  };
}

// Escapes user text so it renders literally and cannot add Markdown structure
// (headings, lists, checkboxes, links, tables) to the legal document.
export function escapeMarkdown(value: string): string {
  return value
    .trim()
    .replace(/[\\`*_[\]<>#|~]/g, "\\$&")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^(\s*)([-+=])/, "$1\\$2")
        .replace(/^(\s*\d+)([.)])/, "$1\\$2"),
    )
    .join("\n");
}

// An empty value becomes a bracketed placeholder, or stays empty without one.
const blank = (value: string, placeholder?: string) =>
  escapeMarkdown(value) || (placeholder ? `[${placeholder}]` : "");

// Single-line fields: collapse any line breaks before escaping.
const inline = (value: string, placeholder?: string) =>
  blank(value.replace(/\s*\r?\n\s*/g, " "), placeholder);

// A term length must be a whole number of years, at least 1.
export const isValidYears = (value: string) => /^[1-9]\d{0,2}$/.test(value.trim());
const years = (value: string) => (isValidYears(value) ? value.trim() : "[N]");

const check = (on: boolean) => (on ? "[x]" : "[ ]");

// YYYY-MM-DD in the user's local time zone (toISOString would use UTC).
export function localDateString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Table cells must stay on one line.
const cell = (value: string) => inline(value);

export function buildCoverPage(f: NdaFields): string {
  const expires = f.mndaTermType === "expires";
  const limited = f.confidentialityType === "years";
  const row = (label: string, a: string, b: string) =>
    `| ${label} | ${cell(a)} | ${cell(b)} |`;

  return `# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“**Cover Page**”) and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 (“**Standard Terms**”) identical to those posted at [commonpaper.com/standards/mutual-nda/1.0](https://commonpaper.com/standards/mutual-nda/1.0). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.

### Purpose
*How Confidential Information may be used*

${blank(f.purpose, "Purpose")}

### Effective Date
${inline(f.effectiveDate, "Effective Date")}

### MNDA Term
*The length of this MNDA*
- ${check(expires)} Expires ${years(f.mndaTermYears)} year(s) from Effective Date.
- ${check(!expires)} Continues until terminated in accordance with the terms of the MNDA.

### Term of Confidentiality
*How long Confidential Information is protected*
- ${check(limited)} ${years(f.confidentialityYears)} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.
- ${check(!limited)} In perpetuity.

### Governing Law & Jurisdiction
Governing Law: ${inline(f.governingLaw, "Fill in state")}

Jurisdiction: ${inline(f.jurisdiction, "Fill in city or county and state")}

### MNDA Modifications
${escapeMarkdown(f.modifications) || "None."}

By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.

| | PARTY 1 | PARTY 2 |
|:--- | :----: | :----: |
${row("Signature", "", "")}
${row("Print Name", f.party1.name, f.party2.name)}
${row("Title", f.party1.title, f.party2.title)}
${row("Company", f.party1.company, f.party2.company)}
${row("Notice Address", f.party1.noticeAddress, f.party2.noticeAddress)}
${row("Date", f.party1.date, f.party2.date)}

Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
`;
}

// The Standard Terms are used verbatim: "Governing Law" and "Jurisdiction" are
// defined terms whose values are set on the cover page.
export function buildDocument(terms: string, f: NdaFields): string {
  return `${buildCoverPage(f)}\n---\n\n${terms}`;
}
