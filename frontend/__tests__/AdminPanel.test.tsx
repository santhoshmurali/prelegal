import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "@/components/AdminPanel";
import { fakeResponse } from "./helpers";

const replace = vi.fn();
const router = { replace };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const admin = { id: 1, username: "admin", isAdmin: true };
const ana = { id: 2, username: "ana", isAdmin: false, isActive: true };

describe("AdminPanel", () => {
  beforeEach(() => {
    replace.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends a signed-out visitor to the login page", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(401, {}));

    render(<AdminPanel />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("sends a signed-in non-admin to the platform", async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse(200, { ...ana, isAdmin: false }));

    render(<AdminPanel />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/platform/"));
  });

  it("lists accounts and deactivates a user", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(fakeResponse(200, admin))
      .mockResolvedValueOnce(fakeResponse(200, [{ id: 1, username: "admin", isAdmin: true, isActive: true }, ana]))
      .mockResolvedValueOnce(fakeResponse(200, { ...ana, isActive: false }));
    render(<AdminPanel />);

    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));

    expect(fetch).toHaveBeenLastCalledWith(
      "/api/admin/users/2",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ isActive: false }) }),
    );
    expect(await screen.findByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate" })).toBeInTheDocument();
  });

  it("shows the reason when the change is refused", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(fakeResponse(200, admin))
      .mockResolvedValueOnce(fakeResponse(200, [ana]))
      .mockResolvedValueOnce(fakeResponse(400, { detail: "You cannot deactivate your own account." }));
    render(<AdminPanel />);

    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot deactivate your own account.");
  });
});
