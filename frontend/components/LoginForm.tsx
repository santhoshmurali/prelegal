"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const LOGIN_ENDPOINT = "/api/auth/login";
const INVALID_CREDENTIALS = "Invalid username or password.";
const DEACTIVATED_ACCOUNT = "This account has been deactivated.";

/** Signs the user in through the backend and opens the platform on success. */
export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    if (response.ok) {
      router.push("/platform/");
      return;
    }
    setError(response.status === 403 ? DEACTIVATED_ACCOUNT : INVALID_CREDENTIALS);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-[#032147]">
        Username
        <input
          name="username"
          type="text"
          autoComplete="username"
          className="rounded border border-zinc-300 px-3 py-2 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-[#032147]">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="rounded border border-zinc-300 px-3 py-2 font-normal"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="rounded bg-[#753991] px-4 py-2 font-semibold text-white hover:opacity-90"
      >
        Sign in
      </button>
    </form>
  );
}
