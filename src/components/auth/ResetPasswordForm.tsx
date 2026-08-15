"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthBrandLink, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { PasswordField } from "@/components/PasswordField";
import { updatePasswordAfterReset } from "@/lib/actions/auth";
import type { AuthSideSlide } from "@/lib/products";

const fieldClass =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

export function ResetPasswordForm({
  sideSlides = [],
}: {
  sideSlides?: AuthSideSlide[];
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    setPending(true);
    const result = await updatePasswordAfterReset(password);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/prihlasenie");
    router.refresh();
  }

  return (
    <AuthSplitShell
      sideSlides={sideSlides}
      sideTitle="Nové heslo"
      sideBody="Nastavte si nové heslo k vášmu účtu PACIDEKOR."
    >
      <div className="mb-8">
        <AuthBrandLink />
        <h1 className="mt-6 font-heading text-3xl font-semibold text-[#2f2924]">
          Nové heslo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/60">
          Zadajte nové heslo (minimálne 6 znakov).
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full"
        noValidate
        aria-label="Nastavenie nového hesla"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="reset-password"
              className="mb-1.5 block text-sm font-medium text-[#2f2924]"
            >
              Nové heslo
            </label>
            <PasswordField
              id="reset-password"
              name="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label
              htmlFor="reset-password-confirm"
              className="mb-1.5 block text-sm font-medium text-[#2f2924]"
            >
              Potvrdenie hesla
            </label>
            <PasswordField
              id="reset-password-confirm"
              name="confirm"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
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
          {pending ? "Ukladám…" : "Uložiť nové heslo"}
        </button>

        <p className="mt-5 text-center text-sm text-[#2f2924]/55">
          Späť na{" "}
          <Link
            href="/prihlasenie"
            className="font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
          >
            prihlásenie
          </Link>
        </p>
      </form>
    </AuthSplitShell>
  );
}
