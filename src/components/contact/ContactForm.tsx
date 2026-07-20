"use client";

import { useState, type FormEvent } from "react";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/8 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white focus:ring-2 focus:ring-[#75825B]/15";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <h2 className="font-heading text-2xl font-semibold text-[#2f2924]">
        Napíšte nám
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/60">
        Odpovieme zvyčajne do 24 hodín.
      </p>

      <div className="mt-6 flex flex-1 flex-col gap-3.5">
        <div>
          <label htmlFor="contact-name" className="sr-only">
            Meno a priezvisko
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={fieldClass}
            placeholder="Meno a priezvisko"
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-email" className="sr-only">
              E-mail
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={fieldClass}
              placeholder="E-mail"
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className="sr-only">
              Telefón
            </label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className={fieldClass}
              placeholder="Telefón (voliteľné)"
            />
          </div>
        </div>

        <div className="flex-1">
          <label htmlFor="contact-message" className="sr-only">
            Správa
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={6}
            className="min-h-[9rem] w-full resize-y rounded-xl border border-black/8 bg-[#faf8f5] px-3.5 py-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white focus:ring-2 focus:ring-[#75825B]/15"
            placeholder="Vaša správa…"
          />
        </div>
      </div>

      {sent ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-[#e8ebe2] px-4 py-3 text-sm text-[#2f2924]"
        >
          Ďakujeme - ozveme sa vám čo najskôr.
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Odoslať správu
      </button>
    </form>
  );
}
