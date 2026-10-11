import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupForm from "@/components/SignupForm";
import { fakeResponse } from "./helpers";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

async function signUp(username: string, password: string) {
  const user = userEvent.setup();
  render(<SignupForm />);
  await user.type(screen.getByLabelText(/Username/), username);
  await user.type(screen.getByLabelText(/Password/), password);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignupForm", () => {
  beforeEach(() => {
    push.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("creates the account and opens the platform", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(201));

    await signUp("ana", "long-enough-pass");

    expect(fetch).toHaveBeenCalledWith("/api/auth/signup", expect.objectContaining({ method: "POST" }));
    expect(push).toHaveBeenCalledWith("/platform/");
  });

  it("says when the username is taken", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(409));

    await signUp("admin", "long-enough-pass");

    expect(await screen.findByRole("alert")).toHaveTextContent("That username is taken.");
    expect(push).not.toHaveBeenCalled();
  });

  it("says when the password is too short", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(422));

    await signUp("ana", "short");

    expect(await screen.findByRole("alert")).toHaveTextContent("Password must be at least 8 characters.");
  });
});
