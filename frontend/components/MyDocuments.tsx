"use client";

import type { DraftSummary } from "@/lib/savedDocuments";

/** Lists the signed-in user's saved drafts. Opening one reloads it into the chat and preview. */
export default function MyDocuments({
  drafts,
  currentId,
  onOpen,
  onNew,
}: {
  drafts: DraftSummary[];
  currentId: number | null;
  onOpen: (id: number) => void;
  onNew: () => void;
}) {
  return (
    <section aria-label="My documents" className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 print:hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-navy">My documents</h2>
        <button
          type="button"
          onClick={onNew}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-navy hover:bg-zinc-50"
        >
          New document
        </button>
      </div>
      {drafts.length === 0 ? (
        <p className="text-sm text-muted">No saved documents yet. Mr. Legal saves a draft as soon as it picks a document.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <button
                type="button"
                onClick={() => onOpen(draft.id)}
                aria-current={draft.id === currentId ? "true" : undefined}
                className={`w-full rounded border px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                  draft.id === currentId ? "border-primary bg-primary/5" : "border-zinc-200"
                }`}
              >
                <span className="block font-medium text-navy">{draft.title}</span>
                <span className="block text-xs text-muted">Updated {new Date(draft.updatedAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
