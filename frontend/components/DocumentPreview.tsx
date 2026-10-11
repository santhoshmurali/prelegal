"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        <h2 className="mr-auto text-lg font-semibold text-[#032147]">{title}</h2>
        <button
          onClick={download}
          disabled={!markdown}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
      <article className="nda-preview min-h-[28rem] rounded border border-zinc-200 bg-white p-8 text-zinc-900 print:border-0 print:p-0">
        {markdown ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        ) : (
          <p className="text-sm text-[#888888]">
            Describe the agreement you need to Mr. Legal. The document appears here as you answer.
          </p>
        )}
      </article>
    </section>
  );
}
