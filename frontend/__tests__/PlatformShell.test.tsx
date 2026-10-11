import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformShell from "@/components/PlatformShell";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function response(status: number, body: unknown = {}) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("PlatformShell", () => {
  beforeEach(() => {
    replace.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends a signed-out visitor to the login page without showing the platform", async () => {
    vi.mocked(fetch).mockResolvedValue(response(401));

    render(<PlatformShell>secret platform</PlatformShell>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("secret platform")).not.toBeInTheDocument();
  });

  it("shows the signed-in username and the platform", async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, { id: 1, username: "admin", isAdmin: true }));

    render(<PlatformShell>platform body</PlatformShell>);

    expect(await screen.findByText("admin")).toBeInTheDocument();
    expect(screen.getByText("platform body")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs out and returns to the login page", async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, { id: 1, username: "admin", isAdmin: true }));
    render(<PlatformShell>platform body</PlatformShell>);
    await screen.findByText("admin");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(replace).toHaveBeenCalledWith("/");
  });
});
