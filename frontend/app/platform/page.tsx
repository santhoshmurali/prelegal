import Platform from "@/components/Platform";
import { loadDocuments, loadTemplates } from "@/lib/templates";

export default async function PlatformPage() {
  const documents = await loadDocuments();
  const templates = await loadTemplates(documents);
  return (
    <main>
      <header className="border-b border-zinc-200 px-6 py-4 print:hidden">
        <h1 className="text-xl font-semibold">Prelegal · Mr. Legal</h1>
        <p className="text-sm text-zinc-600">
          Describe the agreement you need. Mr. Legal asks the questions and fills in the document as you answer.
        </p>
      </header>
      <Platform documents={documents} templates={templates} />
    </main>
  );
}
