"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

type Phase = "confirm" | "done";

/**
 * MVP: potvrdenie odhlásenia z newslettera.
 * Skutočné uloženie do DB / Brevo napojíme spolu so signupom.
 */
export function NewsletterUnsubscribeForm({
  email,
}: {
  email?: string;
}) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [pending, setPending] = useState(false);

  function confirmUnsubscribe() {
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      setPhase("done");
    }, 350);
  }

  if (phase === "done") {
    return (
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-black/6 bg-white p-6 sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#e8ebe2] text-[#75825B]">
          <Check className="size-5" strokeWidth={2.25} aria-hidden />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
          Ste odhlásení
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
          {email ? (
            <>
              Adresa{" "}
              <span className="font-medium text-[#2f2924]">{email}</span> už
              nebude dostávať newsletter PACIDEKOR.
            </>
          ) : (
            <>Odber newslettera bol zrušený. Ďakujeme za doterajší záujem.</>
          )}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Späť na eshop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-black/6 bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-[0.14em] text-[#75825B] uppercase">
        Newsletter
      </p>
      <h1 className="mt-3 font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
        Odhlásiť sa z newslettera?
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
        Naozaj si prajete prestať dostávať novinky a akcie z PACIDEKOR
        {email ? (
          <>
            {" "}
            na adresu{" "}
            <span className="font-medium text-[#2f2924]">{email}</span>
          </>
        ) : null}
        ? Odhlásenie môžete kedykoľvek znova obnoviť prihlásením na odber na
        webe.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={confirmUnsubscribe}
          disabled={pending}
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 sm:flex-1"
        >
          {pending ? "Odhlasujem…" : "Áno, odhlásiť"}
        </button>
        <Link
          href="/"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-black/10 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5] sm:flex-1"
        >
          Zrušiť
        </Link>
      </div>
    </div>
  );
}
