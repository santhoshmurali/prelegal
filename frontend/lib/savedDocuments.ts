import type { DocumentSpec, Values } from "@/lib/documents";

const DRAFTS_ENDPOINT = "/api/documents";

export type DraftSummary = {
  id: number;
  documentId: string;
  title: string;
  updatedAt: string;
};

export type Draft = DraftSummary & { values: Values };

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function listDrafts(): Promise<DraftSummary[]> {
  return readJson(await fetch(DRAFTS_ENDPOINT));
}

export async function getDraft(id: number): Promise<Draft> {
  return readJson(await fetch(`${DRAFTS_ENDPOINT}/${id}`));
}

export async function createDraft(documentId: string, title: string, values: Values): Promise<Draft> {
  return readJson(
    await fetch(DRAFTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, title, values }),
    }),
  );
}

export async function updateDraft(id: number, documentId: string, title: string, values: Values): Promise<Draft> {
  return readJson(
    await fetch(`${DRAFTS_ENDPOINT}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, title, values }),
    }),
  );
}

// The document name, with the first party's name when Mr. Legal has it, so drafts are easy to tell apart.
export function draftTitle(doc: DocumentSpec, values: Values): string {
  return values.party1Name ? `${doc.name} - ${values.party1Name}` : doc.name;
}
