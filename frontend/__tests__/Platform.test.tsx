import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Platform from "@/components/Platform";
import type { DocumentSpec } from "@/lib/documents";
import type { Draft, DraftSummary } from "@/lib/savedDocuments";

const templatesDir = path.join(__dirname, "..", "..", "templates");
const documents: DocumentSpec[] = JSON.parse(readFileSync(path.join(templatesDir, "documents.json"), "utf8"));
const templates = Object.fromEntries(
  documents.map((doc) => [doc.template, readFileSync(path.join(templatesDir, doc.template), "utf8")]),
);

const SAVED_ID = 7;
const NOW = "2026-10-11T10:00:00+00:00";
const NDA_TITLE = "Mutual Non-Disclosure Agreement - Ana";

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

/**
 * Answers the platform's requests by URL and method: chat replies come from the queue,
 * drafts are echoed back with the saved id. Returns every request so tests can check them.
 */
function mockApi(chatBodies: unknown[], drafts: DraftSummary[] = [], openable: Draft | null = null) {
  const replies = [...chatBodies];
  const requests: { method: string; url: string; body?: Record<string, unknown> }[] = [];
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ method, url, body });
    if (url === "/api/chat") return json(replies.shift());
    if (url === "/api/documents" && method === "GET") return json(drafts);
    if (url === "/api/documents" && method === "POST") {
      return json({ id: SAVED_ID, updatedAt: NOW, ...body }, 201);
    }
    if (url === `/api/documents/${SAVED_ID}` && method === "PUT") return json({ id: SAVED_ID, updatedAt: NOW, ...body });
    if (openable && url === `/api/documents/${openable.id}`) return json(openable);
    throw new Error(`unexpected request: ${method} ${url}`);
  });
  return requests;
}

function renderPlatform() {
  return render(<Platform documents={documents} templates={templates} />);
}

async function say(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message Mr. Legal"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("Platform", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/platform/");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("starts with no document and fills the NDA preview as Mr. Legal learns the details", async () => {
    mockApi([
      { reply: "Which state?", documentId: "Mutual-NDA", fieldUpdates: { purpose: "Sales talks" } },
      { reply: "Thanks.", documentId: "Mutual-NDA", fieldUpdates: { governingLaw: "Delaware" } },
    ]);
    const user = userEvent.setup();
    renderPlatform();
    expect(screen.getByText("No document yet")).toBeInTheDocument();

    await say(user, "I need an NDA");
    await screen.findByText("Which state?");
    expect(screen.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();

    await say(user, "Delaware please");
    await screen.findByText("Governing Law: Delaware");
  });

  it("switches the preview to another document when Mr. Legal chooses it", async () => {
    mockApi([{ reply: "I'll draft a Cloud Service Agreement.", documentId: "CSA", fieldUpdates: { subscriptionPeriod: "12 months" } }]);
    const user = userEvent.setup();
    renderPlatform();

    await say(user, "I need SaaS terms");

    expect(await screen.findByRole("heading", { level: 1, name: "Cloud Service Agreement" })).toBeInTheDocument();
    expect(screen.getByText("Subscription period:")).toBeInTheDocument();
    expect(screen.getByText(/12 months/)).toBeInTheDocument();
  });

  it("saves a new draft when Mr. Legal picks a document, then updates it on later turns", async () => {
    const requests = mockApi([
      { reply: "Which state?", documentId: "Mutual-NDA", fieldUpdates: { party1Name: "Ana" } },
      { reply: "Thanks.", documentId: "Mutual-NDA", fieldUpdates: { governingLaw: "Delaware" } },
    ]);
    const user = userEvent.setup();
    renderPlatform();

    await say(user, "NDA with Ana");
    await screen.findByText("Which state?");
    await say(user, "Delaware");
    await screen.findByText("Governing Law: Delaware");

    const saves = requests.filter((request) => request.method !== "GET" && request.url.startsWith("/api/documents"));
    expect(saves.map((request) => request.method)).toEqual(["POST", "PUT"]);
    expect(saves[0].body).toEqual({ documentId: "Mutual-NDA", title: NDA_TITLE, values: { party1Name: "Ana" } });
    expect(saves[1].url).toBe(`/api/documents/${SAVED_ID}`);
    expect(saves[1].body?.values).toEqual({ party1Name: "Ana", governingLaw: "Delaware" });
    expect(window.location.search).toBe(`?doc=${SAVED_ID}`);
  });

  it("lists saved drafts and reopens one with its values", async () => {
    const summary: DraftSummary = { id: 5, documentId: "Mutual-NDA", title: NDA_TITLE, updatedAt: NOW };
    const draft: Draft = { ...summary, values: { governingLaw: "Delaware" } };
    mockApi([], [summary], draft);
    const user = userEvent.setup();
    renderPlatform();

    await user.click(await screen.findByRole("button", { name: new RegExp(NDA_TITLE) }));

    expect(await screen.findByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();
    expect(screen.getByText("Governing Law: Delaware")).toBeInTheDocument();
    expect(window.location.search).toBe("?doc=5");
  });

  it("starts a new document when asked, leaving the saved draft untouched", async () => {
    const summary: DraftSummary = { id: 5, documentId: "Mutual-NDA", title: NDA_TITLE, updatedAt: NOW };
    const draft: Draft = { ...summary, values: { governingLaw: "Delaware" } };
    const requests = mockApi([], [summary], draft);
    const user = userEvent.setup();
    renderPlatform();
    await user.click(await screen.findByRole("button", { name: new RegExp(NDA_TITLE) }));
    await screen.findByText("Governing Law: Delaware");

    await user.click(screen.getByRole("button", { name: "New document" }));

    await waitFor(() => expect(screen.getByText("No document yet")).toBeInTheDocument());
    expect(window.location.search).toBe("");
    expect(requests.some((request) => request.method === "PUT")).toBe(false);
  });
});
