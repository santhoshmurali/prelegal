import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginForm from "@/components/LoginForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("LoginForm", () => {
  beforeEach(() => push.mockClear());

  it("opens the platform on sign in without checking credentials", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(push).toHaveBeenCalledWith("/platform/");
  });
});
