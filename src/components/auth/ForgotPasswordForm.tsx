"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthBrandLink, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { requestPasswordReset } from "@/lib/actions/auth";
import type { AuthSideSlide } from "@/lib/products";

const fieldClass =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

export function ForgotPasswordForm({
  sideSlides = [],
  accountType = "maloobchod",
  invalidLink = false,
}: {
  sideSlides?: AuthSideSlide[];
  accountType?: "maloobchod" | "velkoobchod";
  invalidLink?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const loginHref =
    accountType === "velkoobchod" ? "/prihlasenie/velkoobchod" : "/prihlasenie";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const result = await requestPasswordReset(email);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSent(true);
  }

  return (
    <AuthSplitShell
      sideSlides={sideSlides}
      sideTitle="Obnova hesla"
      sideBody="Pošleme vám odkaz na obnovenie hesla na e-mail."
    >
      <div className="mb-8">
        <AuthBrandLink />
        <h1 className="mt-6 font-heading text-3xl font-semibold text-[#2f2924]">
          Zabudnuté heslo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/60">
          Zadajte e-mail k vášmu účtu a pošleme vám odkaz na nastavenie nového
          hesla.
        </p>
      </div>

      {invalidLink && !sent ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-3 text-sm leading-relaxed text-[#9a4d3f]"
        >
          Odkaz na obnovenie hesla je neplatný alebo expirovaný. Zadajte e-mail
          a pošleme vám nový.
        </p>
      ) : null}

      {sent ? (
        <div className="space-y-5">
          <p
            role="status"
            className="rounded-xl border border-[#75825B]/25 bg-[#eef1e8] px-3.5 py-3 text-sm leading-relaxed text-[#2f2924]"
          >
            Ak účet s týmto e-mailom existuje, poslali sme vám odkaz na obnovenie
            hesla. Skontrolujte schránku aj spam.
          </p>
          <Link
            href={loginHref}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Späť na prihlásenie
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="w-full"
          noValidate
          aria-label="Obnova zabudnutého hesla"
        >
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1.5 block text-sm font-medium text-[#2f2924]"
            >
              E-mail
            </label>
            <input
              id="forgot-email"
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
            {pending ? "Odosielam…" : "Poslať odkaz"}
          </button>

          <p className="mt-5 text-center text-sm text-[#2f2924]/55">
            Späť na{" "}
            <Link
              href={loginHref}
              className="font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
            >
              prihlásenie
            </Link>
          </p>
        </form>
      )}
    </AuthSplitShell>
  );
}
