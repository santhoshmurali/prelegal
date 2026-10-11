import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatPanel, { buildIntro } from "@/components/ChatPanel";
import type { ChatTurn, DocumentSpec } from "@/lib/documents";

const documents: DocumentSpec[] = [
  { id: "Mutual-NDA", name: "Mutual Non-Disclosure Agreement", description: "NDA for sharing secrets.", template: "a.md", fields: [] },
  { id: "CSA", name: "Cloud Service Agreement", description: "SaaS on a subscription.", template: "b.md", fields: [] },
];

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

const turn = (overrides: Partial<ChatTurn> = {}): ChatTurn => ({
  reply: "Thanks.",
  documentId: null,
  fieldUpdates: {},
  ...overrides,
});

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens with an introduction listing the supported documents and limited help", () => {
    render(<ChatPanel documents={documents} documentId={null} values={{}} onTurn={vi.fn()} />);

    const log = screen.getByRole("log");
    expect(within(log).getByText(/Mr\. Legal/)).toBeInTheDocument();
    expect(within(log).getByText("Mutual Non-Disclosure Agreement:")).toBeInTheDocument();
    expect(within(log).getByText("Cloud Service Agreement:")).toBeInTheDocument();
    expect(within(log).getByText(/limited help with other agreements/)).toBeInTheDocument();
  });

  it("sends the history, chosen document and current values, then reports the turn", async () => {
    const onTurn = vi.fn();
    const reply = turn({ reply: "Which state?", documentId: "Mutual-NDA", fieldUpdates: { purpose: "Sales" } });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(reply));
    const user = userEvent.setup();
    render(<ChatPanel documents={documents} documentId="Mutual-NDA" values={{ governingLaw: "Texas" }} onTurn={onTurn} />);

    await user.type(screen.getByLabelText("Message Mr. Legal"), "We need an NDA");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Which state?");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(JSON.parse(init!.body as string)).toEqual({
      messages: [{ role: "user", content: "We need an NDA" }],
      documentId: "Mutual-NDA",
      currentValues: { governingLaw: "Texas" },
    });
    expect(onTurn).toHaveBeenCalledWith(reply);
  });

  it("renders the reply's questions as a Markdown bullet list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(turn({ reply: "I still need:\n\n- The effective date?\n- The jurisdiction?" })),
    );
    const user = userEvent.setup();
    render(<ChatPanel documents={documents} documentId={null} values={{}} onTurn={vi.fn()} />);

    await user.type(screen.getByLabelText("Message Mr. Legal"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect((await screen.findByText("The jurisdiction?")).tagName).toBe("LI");
  });

  it("shows an error when the request fails and reports no turn", async () => {
    const onTurn = vi.fn();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false));
    const user = userEvent.setup();
    render(<ChatPanel documents={documents} documentId={null} values={{}} onTurn={onTurn} />);

    await user.type(screen.getByLabelText("Message Mr. Legal"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(screen.getByText("Mr. Legal is unavailable right now. Please try again.")).toBeInTheDocument(),
    );
    expect(onTurn).not.toHaveBeenCalled();
  });
});

describe("buildIntro", () => {
  it("names every document with its description", () => {
    const intro = buildIntro(documents);

    expect(intro).toContain("- **Cloud Service Agreement:** SaaS on a subscription.");
  });
});
