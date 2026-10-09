import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NdaCreator from "@/components/NdaCreator";

const terms = readFileSync(
  path.join(__dirname, "..", "..", "templates", "Mutual-NDA.md"),
  "utf8",
);

describe("NdaCreator", () => {
  it("renders the form and the agreement", () => {
    render(<NdaCreator terms={terms} />);
    expect(
      screen.getByRole("form", { name: /mutual nda details/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Equitable Relief/)).toBeInTheDocument();
  });

  it("updates the preview as the user types", async () => {
    const user = userEvent.setup();
    render(<NdaCreator terms={terms} />);
    await user.type(screen.getByLabelText(/governing law/i), "Delaware");
    expect(screen.getByText("Governing Law: Delaware")).toBeInTheDocument();
  });

  it("fills party details into the signature table", async () => {
    const user = userEvent.setup();
    render(<NdaCreator terms={terms} />);
    const party1 = screen.getByRole("group", { name: "Party 1" });
    await user.type(
      within(party1).getByLabelText("Print name"),
      "Ada Lovelace",
    );
    const table = screen.getByRole("table");
    expect(within(table).getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("switches the term options", async () => {
    const user = userEvent.setup();
    render(<NdaCreator terms={terms} />);
    await user.click(screen.getByLabelText(/continues until terminated/i));
    const item = (text: RegExp) =>
      screen.getAllByRole("listitem").find((li) => text.test(li.textContent))!;
    const box = (li: HTMLElement) => within(li).getByRole("checkbox");
    expect(box(item(/Continues until terminated in accordance/))).toBeChecked();
    expect(box(item(/^\s*Expires/))).not.toBeChecked();
  });

  it("flags invalid year values", async () => {
    const user = userEvent.setup();
    render(<NdaCreator terms={terms} />);
    const years = screen.getByLabelText("MNDA term years");
    expect(years).toHaveAttribute("aria-invalid", "false");
    await user.clear(years);
    await user.type(years, "0");
    expect(years).toHaveAttribute("aria-invalid", "true");
  });

  describe("effective date", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 9, 0, 30));
    });
    afterEach(() => vi.useRealTimers());

    it("Use today sets the local date", async () => {
      const user = userEvent.setup();
      render(<NdaCreator terms={terms} />);
      await user.click(screen.getByRole("button", { name: /use today/i }));
      expect(screen.getByLabelText(/effective date/i)).toHaveValue(
        "2026-10-09",
      );
    });
  });

  it("downloads the document as Markdown", async () => {
    const user = userEvent.setup();
    const create = vi.fn<(blob: Blob) => string>(() => "blob:test");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<NdaCreator terms={terms} />);
    await user.click(screen.getByRole("button", { name: /download/i }));
    expect(create).toHaveBeenCalledOnce();
    expect(await create.mock.calls[0][0].text()).toContain(
      "# Mutual Non-Disclosure Agreement",
    );
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:test");
    click.mockRestore();
  });

  it("opens the print dialog", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<NdaCreator terms={terms} />);
    await user.click(screen.getByRole("button", { name: /print/i }));
    expect(print).toHaveBeenCalledOnce();
  });
});
