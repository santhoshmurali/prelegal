"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ME_ENDPOINT = "/api/auth/me";
const LOGOUT_ENDPOINT = "/api/auth/logout";
const USERS_ENDPOINT = "/api/admin/users";

type SignedInUser = { id: number; username: string; isAdmin: boolean };
type Account = { id: number; username: string; isAdmin: boolean; isActive: boolean };

/** Lists every account and lets the admin activate or deactivate them. Anyone else is sent away. */
export default function AdminPanel() {
  const router = useRouter();
  const [me, setMe] = useState<SignedInUser | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      const response = await fetch(ME_ENDPOINT);
      if (!response.ok) {
        router.replace("/");
        return;
      }
      const user: SignedInUser = await response.json();
      if (!user.isAdmin) {
        router.replace("/platform/");
        return;
      }
      setMe(user);
      setAccounts(await (await fetch(USERS_ENDPOINT)).json());
    }
    loadPage();
  }, [router]);

  async function toggleActive(account: Account) {
    const response = await fetch(`${USERS_ENDPOINT}/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !account.isActive }),
    });
    if (!response.ok) {
      setError((await response.json()).detail);
      return;
    }
    const updated: Account = await response.json();
    setError(null);
    setAccounts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function signOut() {
    await fetch(LOGOUT_ENDPOINT, { method: "POST" });
    router.replace("/");
  }

  if (!me) return null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-navy">Prelegal · Users</h1>
          <p className="text-sm text-muted">Activate or deactivate accounts. Deactivated users are signed out at once.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/platform/" className="font-medium text-primary">Platform</Link>
          <span className="text-navy">{me.username}</span>
          <button type="button" onClick={signOut} className="rounded border border-zinc-300 px-3 py-1.5 font-medium text-navy hover:bg-zinc-50">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-navy">
              <th className="py-2">Username</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
              <th className="py-2"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-zinc-100">
                <td className="py-2 font-medium text-navy">{account.username}</td>
                <td className="py-2">{account.isAdmin ? "Admin" : "User"}</td>
                <td className="py-2">{account.isActive ? "Active" : "Deactivated"}</td>
                <td className="py-2 text-right">
                  {account.id === me.id ? (
                    <span className="text-muted">You</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleActive(account)}
                      className="rounded border border-zinc-300 px-3 py-1 font-medium text-navy hover:bg-zinc-50"
                    >
                      {account.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
