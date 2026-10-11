import {
  buildDocument,
  defaultFields,
  escapeMarkdown,
  type NdaFields,
  type PartyFields,
} from "@/lib/nda";

export type DocumentField = {
  key: string;
  label: string;
  hint: string;
  options?: string[];
};

export type DocumentSpec = {
  id: string;
  name: string;
  description: string;
  template: string;
  fields: DocumentField[];
};

export type Values = Record<string, string>;

export type ChatTurn = {
  reply: string;
  documentId: string | null;
  fieldUpdates: Values;
};

// The Mutual NDA keeps its own cover page; every other document uses the generic one.
export const NDA_ID = "Mutual-NDA";

export function applyUpdates(values: Values, updates: Values): Values {
  return { ...values, ...updates };
}

// Maps the flat chat values onto the NDA cover page, using the NDA's defaults for unset fields.
export function toNdaFields(values: Values): NdaFields {
  const base = defaultFields("");
  return {
    purpose: values.purpose ?? base.purpose,
    effectiveDate: values.effectiveDate ?? base.effectiveDate,
    mndaTermType: values.mndaTermType === "continues" ? "continues" : "expires",
    mndaTermYears: values.mndaTermYears ?? base.mndaTermYears,
    confidentialityType: values.confidentialityType === "perpetuity" ? "perpetuity" : "years",
    confidentialityYears: values.confidentialityYears ?? base.confidentialityYears,
    governingLaw: values.governingLaw ?? "",
    jurisdiction: values.jurisdiction ?? "",
    modifications: values.modifications ?? "",
    party1: party(values, "party1"),
    party2: party(values, "party2"),
  };
}

function party(values: Values, prefix: "party1" | "party2"): PartyFields {
  return {
    name: values[`${prefix}Name`] ?? "",
    title: values[`${prefix}Title`] ?? "",
    company: values[`${prefix}Company`] ?? "",
    noticeAddress: values[`${prefix}NoticeAddress`] ?? "",
    date: values[`${prefix}Date`] ?? "",
  };
}

// One line per field: the value, or a bracketed placeholder while it is still unknown.
function detail(field: DocumentField, value: string | undefined): string {
  const text = escapeMarkdown((value ?? "").replace(/\s*\n\s*/g, " "));
  return `- **${field.label}:** ${text || `[${field.label}]`}`;
}

// The template already starts with the document's own title, so only the key details are added above it.
export function buildGenericDocument(doc: DocumentSpec, terms: string, values: Values): string {
  const details = doc.fields.map((field) => detail(field, values[field.key])).join("\n");
  return `## Key details\n\n${details}\n\n---\n\n${terms}`;
}

export function buildPreview(doc: DocumentSpec, terms: string, values: Values): string {
  return doc.id === NDA_ID
    ? buildDocument(terms, toNdaFields(values))
    : buildGenericDocument(doc, terms, values);
}
