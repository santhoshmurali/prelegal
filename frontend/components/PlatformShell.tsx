"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

const ME_ENDPOINT = "/api/auth/me";
const LOGOUT_ENDPOINT = "/api/auth/logout";

type SignedInUser = { username: string; isAdmin: boolean };

/** Shows the platform header and children only to a signed-in user; anyone else goes to the login page. */
export default function PlatformShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SignedInUser | null>(null);

  useEffect(() => {
    async function loadUser() {
      const response = await fetch(ME_ENDPOINT);
      if (!response.ok) {
        router.replace("/");
        return;
      }
      setUser(await response.json());
    }
    loadUser();
  }, [router]);

  async function signOut() {
    await fetch(LOGOUT_ENDPOINT, { method: "POST" });
    router.replace("/");
  }

  if (!user) return null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-[#032147]">Prelegal · Mr. Legal</h1>
          <p className="text-sm text-[#888888]">
            Describe the agreement you need. Mr. Legal asks the questions and fills in the document as you answer.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {user.isAdmin && (
            <Link href="/admin/" className="font-medium text-[#209dd7]">
              Users
            </Link>
          )}
          <span className="text-[#032147]">{user.username}</span>
          <button
            type="button"
            onClick={signOut}
            className="rounded border border-zinc-300 px-3 py-1.5 font-medium text-[#032147] hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </>
  );
}
