import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Platform from "@/components/Platform";
import type { DocumentSpec } from "@/lib/documents";

const templatesDir = path.join(__dirname, "..", "..", "templates");
const documents: DocumentSpec[] = JSON.parse(readFileSync(path.join(templatesDir, "documents.json"), "utf8"));
const templates = Object.fromEntries(
  documents.map((doc) => [doc.template, readFileSync(path.join(templatesDir, doc.template), "utf8")]),
);

function chatReply(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

async function say(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message Mr. Legal"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("Platform", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("starts with no document and fills the NDA preview as Mr. Legal learns the details", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        chatReply({ reply: "Which state?", documentId: "Mutual-NDA", fieldUpdates: { purpose: "Sales talks" } }),
      )
      .mockResolvedValueOnce(
        chatReply({ reply: "Thanks.", documentId: "Mutual-NDA", fieldUpdates: { governingLaw: "Delaware" } }),
      );
    const user = userEvent.setup();
    render(<Platform documents={documents} templates={templates} />);
    expect(screen.getByText("No document yet")).toBeInTheDocument();

    await say(user, "I need an NDA");
    await screen.findByText("Which state?");
    expect(screen.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();

    await say(user, "Delaware please");
    await screen.findByText("Governing Law: Delaware");
  });

  it("switches the preview to another document when Mr. Legal chooses it", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      chatReply({
        reply: "I'll draft a Cloud Service Agreement.",
        documentId: "CSA",
        fieldUpdates: { subscriptionPeriod: "12 months" },
      }),
    );
    const user = userEvent.setup();
    render(<Platform documents={documents} templates={templates} />);

    await say(user, "I need SaaS terms");

    expect(await screen.findByRole("heading", { level: 1, name: "Cloud Service Agreement" })).toBeInTheDocument();
    expect(screen.getByText("Subscription period:")).toBeInTheDocument();
    expect(screen.getByText(/12 months/)).toBeInTheDocument();
  });
});
