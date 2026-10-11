"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatTurn, DocumentSpec, Values } from "@/lib/documents";

type ChatMessage = { role: "user" | "assistant"; content: string };

const ENDPOINT = "/api/chat";

export function buildIntro(documents: DocumentSpec[]): string {
  const list = documents.map((doc) => `- **${doc.name}:** ${doc.description}`).join("\n");
  return [
    "Hi, I'm **Mr. Legal**. I can help you draft these agreements:",
    list,
    "I can also give limited help with other agreements: I'll ask you some questions and draft the closest supported document. Tell me what you need to get started.",
    "_I am not a lawyer and this is not legal advice._",
  ].join("\n\n");
}

function Bubble({ role, content }: ChatMessage) {
  return role === "user" ? (
    <p className="ml-6 rounded bg-primary/10 px-3 py-2 text-zinc-900">{content}</p>
  ) : (
    <div className="mr-6 rounded bg-zinc-100 px-3 py-2 text-zinc-700 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default function ChatPanel({
  documents,
  documentId,
  values,
  onTurn,
}: {
  documents: DocumentSpec[];
  documentId: string | null;
  values: Values;
  onTurn: (turn: ChatTurn) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;

    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setDraft("");
    setPending(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, documentId, currentValues: values }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const turn: ChatTurn = await response.json();
      setMessages([...history, { role: "assistant", content: turn.reply }]);
      onTurn(turn);
    } catch {
      setError("Mr. Legal is unavailable right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Mr. Legal chat" className="flex h-[calc(100vh-8rem)] min-h-[28rem] flex-col rounded-lg border border-zinc-200 bg-white print:hidden">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" role="log">
        <Bubble role="assistant" content={buildIntro(documents)} />
        {messages.map((message, index) => (
          <Bubble key={index} {...message} />
        ))}
        {pending && <p className="text-xs text-muted">Mr. Legal is typing...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <form onSubmit={send} className="border-t border-zinc-200 p-3">
        <label className="sr-only" htmlFor="mr-legal-message">
          Message Mr. Legal
        </label>
        <div className="flex gap-2">
          <input
            id="mr-legal-message"
            className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={documentId ? "Answer Mr. Legal" : "Describe the agreement you need"}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-secondary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
