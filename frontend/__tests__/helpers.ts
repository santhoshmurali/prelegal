import { readFileSync } from "node:fs";
import path from "node:path";
import type { DocumentSpec } from "@/lib/documents";

const TEMPLATES_DIR = path.join(__dirname, "..", "..", "templates");

/** The real document registry from the repository's templates directory. */
export const documents: DocumentSpec[] = JSON.parse(readFileSync(path.join(TEMPLATES_DIR, "documents.json"), "utf8"));

export function templateText(fileName: string): string {
  return readFileSync(path.join(TEMPLATES_DIR, fileName), "utf8");
}

/** A minimal fetch Response with a status and a JSON body. */
export function fakeResponse(status: number, body: unknown = {}): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}
