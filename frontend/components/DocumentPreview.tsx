"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Disclaimer from "@/components/Disclaimer";

export default function DocumentPreview({
  title,
  markdown,
  fileName,
}: {
  title: string;
  markdown: string | null;
  fileName: string;
}) {
  function download() {
    if (!markdown) return;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <h2 className="mr-auto text-lg font-semibold text-navy">{title}</h2>
        <button
          onClick={download}
          disabled={!markdown}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Download (.md)
        </button>
        <button
          onClick={() => window.print()}
          disabled={!markdown}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
        >
          Print / Save as PDF
        </button>
      </div>
      <Disclaimer className="mb-4" />
      <article className="nda-preview min-h-[28rem] rounded-lg border border-zinc-200 bg-white p-8 shadow-sm text-zinc-900 print:border-0 print:p-0">
        {markdown ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        ) : (
          <p className="text-sm text-muted">
            Describe the agreement you need to Mr. Legal. The document appears here as you answer.
          </p>
        )}
      </article>
    </section>
  );
}
