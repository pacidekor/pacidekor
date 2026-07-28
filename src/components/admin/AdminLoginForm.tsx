"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Lock, User } from "lucide-react";
import {
  authenticateAdmin,
  setAdminAuthenticated,
} from "@/lib/admin-auth";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (authenticateAdmin(username, password)) {
      setAdminAuthenticated(true);
      router.replace("/admin");
      return;
    }

    setError("Nesprávne používateľské meno alebo heslo.");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-white/40 bg-white/85 p-6 shadow-[0_20px_50px_rgba(47,41,36,0.18)] backdrop-blur-md sm:p-8"
        noValidate
        aria-label="Prihlásenie do administrácie"
      >
        <div className="pb-1 text-center">
          <Link
            href="/"
            className="font-heading text-3xl tracking-[0.08em] text-foreground transition-opacity hover:opacity-80"
          >
            PACIDEKOR
          </Link>
        </div>

        <div>
          <label
            htmlFor="admin-username"
            className="mb-1.5 block text-sm font-medium text-[#2f2924]"
          >
            Používateľské meno
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
              aria-hidden
            />
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 bg-white/80 pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 transition-colors focus:border-[#75825B] focus:bg-white focus:ring-2 focus:ring-[#75825B]/20"
              placeholder="Používateľské meno"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="mb-1.5 block text-sm font-medium text-[#2f2924]"
          >
            Heslo
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
              aria-hidden
            />
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 bg-white/80 pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 transition-colors focus:border-[#75825B] focus:bg-white focus:ring-2 focus:ring-[#75825B]/20"
              placeholder="Heslo"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#75825B] px-7 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Prihlásiť sa
        </button>

        {error ? (
          <p
            role="alert"
            className="text-center text-sm leading-snug text-[#8f2555]"
          >
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
