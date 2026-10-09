"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  buildDocument,
  defaultFields,
  type NdaFields,
  type PartyFields,
} from "@/lib/nda";

const input =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-600 focus:outline-none";

type TextKey =
  | "purpose"
  | "effectiveDate"
  | "governingLaw"
  | "jurisdiction"
  | "modifications"
  | "mndaTermYears"
  | "confidentialityYears";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function PartyForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: PartyFields;
  onChange: (next: PartyFields) => void;
}) {
  const set =
    (key: keyof PartyFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...value, [key]: e.target.value });
  return (
    <fieldset className="space-y-3 rounded border border-zinc-200 p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <Field label="Print name">
        <input className={input} value={value.name} onChange={set("name")} />
      </Field>
      <Field label="Title">
        <input className={input} value={value.title} onChange={set("title")} />
      </Field>
      <Field label="Company">
        <input
          className={input}
          value={value.company}
          onChange={set("company")}
        />
      </Field>
      <Field label="Notice address (email or postal)">
        <textarea
          className={input}
          rows={2}
          value={value.noticeAddress}
          onChange={set("noticeAddress")}
        />
      </Field>
      <Field label="Date">
        <input
          type="date"
          className={input}
          value={value.date}
          onChange={set("date")}
        />
      </Field>
    </fieldset>
  );
}

export default function NdaCreator({ terms }: { terms: string }) {
  const [fields, setFields] = useState<NdaFields>(() => defaultFields(""));
  const update = <K extends keyof NdaFields>(key: K, value: NdaFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));
  const text =
    (key: TextKey) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(key, e.target.value);

  const markdown = useMemo(() => buildDocument(terms, fields), [terms, fields]);

  function download() {
    const url = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mutual-NDA.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 p-6 lg:grid-cols-[380px_1fr]">
      <form
        className="space-y-5 print:hidden"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Mutual NDA details"
      >
        <Field label="Purpose">
          <textarea
            className={input}
            rows={3}
            value={fields.purpose}
            onChange={text("purpose")}
          />
        </Field>
        <Field label="Effective date">
          <div className="flex gap-2">
            <input
              type="date"
              className={input}
              value={fields.effectiveDate}
              onChange={text("effectiveDate")}
            />
            <button
              type="button"
              className="shrink-0 rounded border border-zinc-300 px-3 text-sm hover:bg-zinc-100"
              onClick={() =>
                update("effectiveDate", new Date().toISOString().slice(0, 10))
              }
            >
              Use today
            </button>
          </div>
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-700">
            MNDA term
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mndaTerm"
              checked={fields.mndaTermType === "expires"}
              onChange={() => update("mndaTermType", "expires")}
            />
            Expires after
            <input
              type="number"
              min={1}
              className={`${input} !w-20`}
              value={fields.mndaTermYears}
              onChange={text("mndaTermYears")}
              aria-label="MNDA term years"
            />
            year(s)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mndaTerm"
              checked={fields.mndaTermType === "continues"}
              onChange={() => update("mndaTermType", "continues")}
            />
            Continues until terminated
          </label>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-700">
            Term of confidentiality
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="confidentiality"
              checked={fields.confidentialityType === "years"}
              onChange={() => update("confidentialityType", "years")}
            />
            <input
              type="number"
              min={1}
              className={`${input} !w-20`}
              value={fields.confidentialityYears}
              onChange={text("confidentialityYears")}
              aria-label="Confidentiality years"
            />
            year(s) (trade secrets protected longer)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="confidentiality"
              checked={fields.confidentialityType === "perpetuity"}
              onChange={() => update("confidentialityType", "perpetuity")}
            />
            In perpetuity
          </label>
        </fieldset>

        <Field label="Governing law (state)">
          <input
            className={input}
            placeholder="e.g. Delaware"
            value={fields.governingLaw}
            onChange={text("governingLaw")}
          />
        </Field>
        <Field label="Jurisdiction (city or county and state)">
          <input
            className={input}
            placeholder="e.g. New Castle, DE"
            value={fields.jurisdiction}
            onChange={text("jurisdiction")}
          />
        </Field>
        <Field label="Modifications to the MNDA">
          <textarea
            className={input}
            rows={3}
            value={fields.modifications}
            onChange={text("modifications")}
          />
        </Field>

        <PartyForm
          title="Party 1"
          value={fields.party1}
          onChange={(v) => update("party1", v)}
        />
        <PartyForm
          title="Party 2"
          value={fields.party2}
          onChange={(v) => update("party2", v)}
        />
      </form>

      <section>
        <div className="mb-4 flex gap-3 print:hidden">
          <button
            onClick={download}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Download (.md)
          </button>
          <button
            onClick={() => window.print()}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            Print / Save as PDF
          </button>
        </div>
        <article className="nda-preview rounded border border-zinc-200 bg-white p-8 text-zinc-900 print:border-0 print:p-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </section>
    </div>
  );
}
