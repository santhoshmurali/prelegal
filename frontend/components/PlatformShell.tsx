"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";

const ME_ENDPOINT = "/api/auth/me";

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

  if (!user) return null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-navy">Prelegal · Mr. Legal</h1>
          <p className="text-sm text-muted">
            Describe the agreement you need. Mr. Legal asks the questions and fills in the document as you answer.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {user.isAdmin && (
            <Link href="/admin/" className="font-medium text-primary">
              Users
            </Link>
          )}
          <span className="text-navy">{user.username}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </>
  );
}
