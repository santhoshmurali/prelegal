"use client";

import { useRouter } from "next/navigation";

const LOGOUT_ENDPOINT = "/api/auth/logout";

/** Ends the session and returns to the sign-in page. */
export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch(LOGOUT_ENDPOINT, { method: "POST" });
    router.replace("/");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded border border-zinc-300 px-3 py-1.5 font-medium text-navy hover:bg-zinc-50"
    >
      Sign out
    </button>
  );
}
