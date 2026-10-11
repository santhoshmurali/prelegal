import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentSpec } from "@/lib/documents";

// The legal templates and their field registry live at the repository root, shared with other tooling.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

export async function loadDocuments(): Promise<DocumentSpec[]> {
  const text = await readFile(path.join(TEMPLATES_DIR, "documents.json"), "utf8");
  return JSON.parse(text) as DocumentSpec[];
}

// Template text by file name, read at build time.
export async function loadTemplates(documents: DocumentSpec[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    documents.map(async (doc) => [doc.template, await readFile(path.join(TEMPLATES_DIR, doc.template), "utf8")] as const),
  );
  return Object.fromEntries(entries);
}
