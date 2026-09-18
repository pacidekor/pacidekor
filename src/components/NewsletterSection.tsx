"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { subscribeNewsletterAction } from "@/lib/actions/newsletter";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const result = await subscribeNewsletterAction({ email });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEmail("");
    setMessage("Ďakujeme! Ste prihlásení na odber noviniek.");
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="cv-auto relative mt-14 w-full overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-9"
    >
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        <Image
          src="/nlcta.webp"
          alt=""
          fill
          draggable={false}
          sizes="80vw"
          quality={90}
          className="object-cover"
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#75825B] uppercase">
          Pripojte sa k nám
        </p>
        <h2
          id="newsletter-heading"
          className="mt-2 font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl"
        >
          Exkluzívne inšpirácie vo vašom e-maile
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#2f2924]/75 sm:text-base">
          Buďte prví, kto získa prístup k novým kolekciám, sezónnej inšpirácii a
          akciám pre členov.
        </p>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-center"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            E-mailová adresa
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Vaša e-mailová adresa"
            className="h-11 w-full rounded-full border border-black/8 bg-white px-5 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/40 transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#75825B] px-7 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 sm:px-8"
          >
            {pending ? "Prihlasujem…" : "Odoberať"}
          </button>
        </form>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-[#9a4d3f]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="mt-3 text-xs text-[#5a6648]">
            {message}
          </p>
        ) : (
          <p className="mt-3 text-xs text-[#2f2924]/55">
            Vážime si vaše súkromie. Odhlásiť sa môžete kedykoľvek.
          </p>
        )}
      </div>
    </section>
  );
}
