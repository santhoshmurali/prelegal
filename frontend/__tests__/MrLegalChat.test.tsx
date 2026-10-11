import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MrLegalChat from "@/components/MrLegalChat";
import { defaultFields } from "@/lib/nda";

const fields = defaultFields("2026-10-11");

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe("MrLegalChat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the conversation and current fields, then shows the reply and applies changes", async () => {
    const onChanges = vi.fn();
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        reply: "Thanks, Delaware noted.",
        fieldUpdates: { governingLaw: "Delaware" },
      }),
    );
    const user = userEvent.setup();
    render(<MrLegalChat fields={fields} onChanges={onChanges} />);

    await user.click(screen.getByRole("button", { name: "Chat with Mr. Legal" }));
    await user.type(screen.getByLabelText("Message Mr. Legal"), "Use Delaware law");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Thanks, Delaware noted.");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/chat/mutual-nda");
    expect(JSON.parse(init!.body as string)).toEqual({
      messages: [{ role: "user", content: "Use Delaware law" }],
      currentFields: fields,
    });
    expect(onChanges).toHaveBeenCalledWith({ governingLaw: "Delaware" });
  });

  it("renders the reply's questions as a Markdown bullet list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        reply: "I still need a few details:\n\n- The effective date?\n- The jurisdiction?",
        fieldUpdates: {},
      }),
    );
    const user = userEvent.setup();
    render(<MrLegalChat fields={fields} onChanges={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Chat with Mr. Legal" }));
    await user.type(screen.getByLabelText("Message Mr. Legal"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const items = await screen.findAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "The effective date?",
      "The jurisdiction?",
    ]);
  });

  it("shows an error when the chat request fails and changes nothing", async () => {
    const onChanges = vi.fn();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false));
    const user = userEvent.setup();
    render(<MrLegalChat fields={fields} onChanges={onChanges} />);

    await user.click(screen.getByRole("button", { name: "Chat with Mr. Legal" }));
    await user.type(screen.getByLabelText("Message Mr. Legal"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(
        screen.getByText("Mr. Legal is unavailable right now. Please try again."),
      ).toBeInTheDocument(),
    );
    expect(onChanges).not.toHaveBeenCalled();
  });
});
