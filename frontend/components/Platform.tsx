"use client";

import { useCallback, useEffect, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import DocumentPreview from "@/components/DocumentPreview";
import MyDocuments from "@/components/MyDocuments";
import {
  applyUpdates,
  buildPreview,
  type ChatTurn,
  type DocumentSpec,
  type Values,
} from "@/lib/documents";
import {
  createDraft,
  type Draft,
  type DraftSummary,
  draftTitle,
  getDraft,
  listDrafts,
  updateDraft,
} from "@/lib/savedDocuments";

const PLATFORM_PATH = "/platform/";

export default function Platform({
  documents,
  templates,
}: {
  documents: DocumentSpec[];
  templates: Record<string, string>;
}) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});
  const [draftId, setDraftId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  const doc = documents.find((candidate) => candidate.id === documentId) ?? null;
  const markdown = doc ? buildPreview(doc, templates[doc.template], values) : null;

  const showDraft = useCallback((draft: Draft) => {
    setDraftId(draft.id);
    setDocumentId(draft.documentId);
    setValues(draft.values);
    setChatKey((key) => key + 1);
    setSaveError(null);
    window.history.replaceState(null, "", `${PLATFORM_PATH}?doc=${draft.id}`);
  }, []);

  useEffect(() => {
    listDrafts().then(setDrafts);
    const requestedId = new URLSearchParams(window.location.search).get("doc");
    if (requestedId) getDraft(Number(requestedId)).then(showDraft);
  }, [showDraft]);

  function startNewDocument() {
    setDraftId(null);
    setDocumentId(null);
    setValues({});
    setChatKey((key) => key + 1);
    setSaveError(null);
    window.history.replaceState(null, "", PLATFORM_PATH);
  }

  async function saveDraft(chosenDocument: DocumentSpec, nextValues: Values) {
    const title = draftTitle(chosenDocument, nextValues);
    try {
      const saved =
        draftId === null
          ? await createDraft(chosenDocument.id, title, nextValues)
          : await updateDraft(draftId, chosenDocument.id, title, nextValues);
      setDraftId(saved.id);
      setSaveError(null);
      window.history.replaceState(null, "", `${PLATFORM_PATH}?doc=${saved.id}`);
      setDrafts(await listDrafts());
    } catch {
      setSaveError("Could not save this document. Your changes are shown but not saved yet.");
    }
  }

  async function handleTurn(turn: ChatTurn) {
    const nextValues = applyUpdates(values, turn.fieldUpdates);
    setValues(nextValues);
    if (!turn.documentId) return;
    setDocumentId(turn.documentId);
    const chosenDocument = documents.find((candidate) => candidate.id === turn.documentId);
    if (chosenDocument) await saveDraft(chosenDocument, nextValues);
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <MyDocuments
        drafts={drafts}
        currentId={draftId}
        onOpen={(id) => getDraft(id).then(showDraft)}
        onNew={startNewDocument}
      />
      {saveError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {saveError}
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <ChatPanel
          key={chatKey}
          documents={documents}
          documentId={documentId}
          values={values}
          onTurn={handleTurn}
        />
        <DocumentPreview
          title={doc ? doc.name : "No document yet"}
          markdown={markdown}
          fileName={doc ? `${doc.id}.md` : "document.md"}
        />
      </div>
    </div>
  );
}
