import NdaCreator from "@/components/NdaCreator";
import { loadMutualNdaTerms } from "@/lib/templates";

export default async function Home() {
  const terms = await loadMutualNdaTerms();
  return (
    <main>
      <header className="border-b border-zinc-200 px-6 py-4 print:hidden">
        <h1 className="text-xl font-semibold">Prelegal · Mutual NDA Creator</h1>
        <p className="text-sm text-zinc-600">
          Fill in the details, review the agreement, then download it.
        </p>
      </header>
      <NdaCreator terms={terms} />
    </main>
  );
}
