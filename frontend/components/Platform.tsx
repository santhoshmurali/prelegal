"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import DocumentPreview from "@/components/DocumentPreview";
import {
  applyUpdates,
  buildPreview,
  type ChatTurn,
  type DocumentSpec,
  type Values,
} from "@/lib/documents";

export default function Platform({
  documents,
  templates,
}: {
  documents: DocumentSpec[];
  templates: Record<string, string>;
}) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});

  const doc = documents.find((candidate) => candidate.id === documentId) ?? null;
  const markdown = doc ? buildPreview(doc, templates[doc.template], values) : null;

  function handleTurn(turn: ChatTurn) {
    if (turn.documentId) setDocumentId(turn.documentId);
    setValues((current) => applyUpdates(current, turn.fieldUpdates));
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 p-6 lg:grid-cols-[380px_1fr]">
      <ChatPanel documents={documents} documentId={documentId} values={values} onTurn={handleTurn} />
      <DocumentPreview
        title={doc ? doc.name : "No document yet"}
        markdown={markdown}
        fileName={doc ? `${doc.id}.md` : "document.md"}
      />
    </div>
  );
}
