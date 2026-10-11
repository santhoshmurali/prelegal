"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NdaFields } from "@/lib/nda";
import type { ChatMessage, ChatTurn, NdaChanges } from "@/lib/chat";

const GREETING =
  "Hi, I'm Mr. Legal. I can help you fill in your Mutual NDA. Tell me a little about the deal to start.";

const ENDPOINT = "/api/chat/mutual-nda";

export default function MrLegalChat({
  fields,
  onChanges,
}: {
  fields: NdaFields;
  onChanges: (changes: NdaChanges) => void;
}) {
  const [open, setOpen] = useState(false);
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
        body: JSON.stringify({ messages: history, currentFields: fields }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const turn: ChatTurn = await response.json();
      setMessages([...history, { role: "assistant", content: turn.reply }]);
      onChanges(turn.fieldUpdates);
    } catch {
      setError("Mr. Legal is unavailable right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-[#753991] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 print:hidden"
      >
        Chat with Mr. Legal
      </button>
    );
  }

  return (
    <section
      aria-label="Mr. Legal chat"
      className="fixed bottom-6 right-6 flex h-[28rem] w-80 flex-col rounded-lg border border-zinc-200 bg-white shadow-xl print:hidden"
    >
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-[#032147]">Mr. Legal</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="text-sm text-[#888888] hover:text-zinc-900"
        >
          Close
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        <p className="rounded bg-zinc-100 px-3 py-2 text-zinc-700">{GREETING}</p>
        {messages.map((message, index) => (
          message.role === "user" ? (
            <p key={index} className="ml-6 rounded bg-blue-50 px-3 py-2 text-zinc-900">
              {message.content}
            </p>
          ) : (
            <div
              key={index}
              className="mr-6 rounded bg-zinc-100 px-3 py-2 text-zinc-700 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )
        ))}
        {pending && <p className="text-xs text-[#888888]">Mr. Legal is typing...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <form onSubmit={send} className="border-t border-zinc-200 p-3">
        <label className="sr-only" htmlFor="mr-legal-message">
          Message Mr. Legal
        </label>
        <div className="flex gap-2">
          <input
            id="mr-legal-message"
            className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-[#753991] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-[#888888]">
          Mr. Legal is not a lawyer and does not give legal advice.
        </p>
      </form>
    </section>
  );
}
