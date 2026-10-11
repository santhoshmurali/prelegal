import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginForm from "@/components/LoginForm";
import { fakeResponse } from "./helpers";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

async function signIn(username: string, password: string) {
  const user = userEvent.setup();
  render(<LoginForm />);
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    push.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("posts the credentials and opens the platform on success", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200));

    await signIn("admin", "secret-pass");

    expect(fetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({
      username: "admin",
      password: "secret-pass",
    });
    expect(push).toHaveBeenCalledWith("/platform/");
  });

  it("shows an error and stays on the page when the credentials are wrong", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(401));

    await signIn("admin", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(push).not.toHaveBeenCalled();
  });

  it("tells a deactivated user that the account is deactivated", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(403));

    await signIn("ana", "secret-pass");

    expect(await screen.findByRole("alert")).toHaveTextContent("This account has been deactivated.");
  });
});
