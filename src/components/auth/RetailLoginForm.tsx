"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthBrandLink, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { loginRetail } from "@/lib/actions/auth";
import { notifyClientAuthChanged } from "@/lib/client-auth";

const fieldClass =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

export function RetailLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const result = await loginRetail(email, password);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    notifyClientAuthChanged();
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthSplitShell
      sideTitle="Vitajte späť"
      sideBody="Prihláste sa do svojho účtu a pokračujte v nákupe."
    >
      <div className="mb-8">
        <AuthBrandLink />
        <h1 className="mt-6 font-heading text-3xl font-semibold text-[#2f2924]">
          Prihlásenie
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/60">
          Pre bežných zákazníkov PACIDEKOR.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full"
        noValidate
        aria-label="Prihlásenie maloobchodného účtu"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="mo-login-email"
              className="mb-1.5 block text-sm font-medium text-[#2f2924]"
            >
              E-mail
            </label>
            <input
              id="mo-login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
              placeholder="vas@email.sk"
            />
          </div>

          <div>
            <label
              htmlFor="mo-login-password"
              className="mb-1.5 block text-sm font-medium text-[#2f2924]"
            >
              Heslo
            </label>
            <input
              id="mo-login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Prihlasujem…" : "Prihlásiť sa"}
        </button>

        <p className="mt-5 text-center text-sm text-[#2f2924]/55">
          Ešte nemáte účet?{" "}
          <Link
            href="/registracia"
            className="font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
          >
            Registrovať sa
          </Link>
        </p>
      </form>
    </AuthSplitShell>
  );
}
