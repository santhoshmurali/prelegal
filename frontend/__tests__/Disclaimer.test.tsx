import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Disclaimer from "@/components/Disclaimer";
import Login from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Disclaimer", () => {
  it("says the documents are drafts that need a lawyer's review", () => {
    render(<Disclaimer />);

    expect(screen.getByRole("note")).toHaveTextContent("Draft only.");
    expect(screen.getByRole("note")).toHaveTextContent("Have a qualified lawyer review them before anyone signs.");
  });

  it("is shown on the sign-in page", () => {
    render(<Login />);

    expect(screen.getByRole("note")).toHaveTextContent("this is not legal advice");
  });
});
