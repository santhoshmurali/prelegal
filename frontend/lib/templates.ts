import { readFile } from "node:fs/promises";
import path from "node:path";

// The legal templates live at the repository root, shared with other tooling.
export async function loadMutualNdaTerms(): Promise<string> {
  "use cache";
  const file = path.join(process.cwd(), "..", "templates", "Mutual-NDA.md");
  return readFile(file, "utf8");
}
