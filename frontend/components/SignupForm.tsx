"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const SIGNUP_ENDPOINT = "/api/auth/signup";
const MIN_PASSWORD_LENGTH = 8;
const USERNAME_TAKEN = "That username is taken. Please choose another.";
const PASSWORD_TOO_SHORT = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** Creates an account through the backend and opens the platform, already signed in. */
export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(SIGNUP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    if (response.ok) {
      router.push("/platform/");
      return;
    }
    setError(response.status === 409 ? USERNAME_TAKEN : PASSWORD_TOO_SHORT);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-[#032147]">
        Username
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          className="rounded border border-zinc-300 px-3 py-2 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-[#032147]">
        Password (at least {MIN_PASSWORD_LENGTH} characters)
        <input
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
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
        Create account
      </button>
    </form>
  );
}
