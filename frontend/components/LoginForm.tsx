"use client";

import { useRouter } from "next/navigation";
import { FormEvent } from "react";

/** Temporary V1 login: no credentials are checked, it only opens the platform. */
export default function LoginForm() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/platform/");
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
      <button
        type="submit"
        className="rounded bg-[#753991] px-4 py-2 font-semibold text-white hover:opacity-90"
      >
        Sign in
      </button>
    </form>
  );
}
