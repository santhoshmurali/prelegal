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

const blank = (value: string, placeholder: string) =>
  value.trim() || `[${placeholder}]`;

const check = (on: boolean) => (on ? "[x]" : "[ ]");

// Table cells must stay on one line and must not contain bare pipes.
const cell = (value: string) =>
  value.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

export function buildCoverPage(f: NdaFields): string {
  const expires = f.mndaTermType === "expires";
  const years = f.confidentialityType === "years";
  const row = (label: string, a: string, b: string) =>
    `| ${label} | ${cell(a)} | ${cell(b)} |`;

  return `# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“**Cover Page**”) and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 (“**Standard Terms**”) identical to those posted at [commonpaper.com/standards/mutual-nda/1.0](https://commonpaper.com/standards/mutual-nda/1.0). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.

### Purpose
*How Confidential Information may be used*

${blank(f.purpose, "Purpose")}

### Effective Date
${blank(f.effectiveDate, "Effective Date")}

### MNDA Term
*The length of this MNDA*
- ${check(expires)} Expires ${blank(f.mndaTermYears, "N")} year(s) from Effective Date.
- ${check(!expires)} Continues until terminated in accordance with the terms of the MNDA.

### Term of Confidentiality
*How long Confidential Information is protected*
- ${check(years)} ${blank(f.confidentialityYears, "N")} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.
- ${check(!years)} In perpetuity.

### Governing Law & Jurisdiction
Governing Law: ${blank(f.governingLaw, "Fill in state")}

Jurisdiction: ${blank(f.jurisdiction, "Fill in city or county and state")}

### MNDA Modifications
${f.modifications.trim() || "None."}

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

// Section 9 of the standard terms uses "Governing Law" and "Jurisdiction" as
// placeholders for the values chosen on the cover page.
export function fillStandardTerms(terms: string, f: NdaFields): string {
  const law = blank(f.governingLaw, "Governing Law");
  const jurisdiction = blank(f.jurisdiction, "Jurisdiction");
  return terms
    .replace(
      "the laws of the State of Governing Law, without regard to the conflict of laws provisions of such Governing Law",
      () =>
        `the laws of the State of ${law}, without regard to the conflict of laws provisions of such State`,
    )
    .replace(
      "courts located in Jurisdiction. Each party irrevocably submits to the exclusive jurisdiction of such Jurisdiction",
      () =>
        `courts located in ${jurisdiction}. Each party irrevocably submits to the exclusive jurisdiction of such courts`,
    );
}

export function buildDocument(terms: string, f: NdaFields): string {
  return `${buildCoverPage(f)}\n---\n\n${fillStandardTerms(terms, f)}`;
}
