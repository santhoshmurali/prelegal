import Platform from "@/components/Platform";
import PlatformShell from "@/components/PlatformShell";
import { loadDocuments, loadTemplates } from "@/lib/templates";

export default async function PlatformPage() {
  const documents = await loadDocuments();
  const templates = await loadTemplates(documents);
  return (
    <main>
      <PlatformShell>
        <Platform documents={documents} templates={templates} />
      </PlatformShell>
    </main>
  );
}
