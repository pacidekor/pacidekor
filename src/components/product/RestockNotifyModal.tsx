"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";
import { BellIcon } from "@/components/icons/BellIcon";
import { fetchClientCustomer } from "@/lib/client-auth";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import {
  getColorPreviewImages,
  type Product,
} from "@/lib/products";
import { subscribeRestockAlert } from "@/lib/restock-alerts";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15 disabled:bg-[#faf8f5] disabled:text-[#2f2924]/70";

type RestockNotifyModalProps = {
  open: boolean;
  onClose: () => void;
  product: Product;
  colorId?: string;
};

export function RestockNotifyModal({
  open,
  onClose,
  product,
  colorId,
}: RestockNotifyModalProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [emailLocked, setEmailLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const preview =
    colorId != null
      ? getColorPreviewImages(product, colorId)
      : { image: product.image };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setDone(false);
    setError(null);
    setSubmitting(false);

    async function hydrate() {
      const customer = await fetchClientCustomer();
      if (cancelled) return;
      if (customer?.email) {
        setAccountEmail(customer.email);
        setEmail(customer.email);
        setEmailLocked(true);
      } else {
        setAccountEmail(null);
        setEmail("");
        setEmailLocked(false);
      }
    }

    void hydrate();

    const unlock = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelled = true;
      unlock();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Zadajte platný e-mail.");
      return;
    }

    setSubmitting(true);
    setError(null);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    subscribeRestockAlert({
      productId: product.id,
      productName: product.name,
      email: trimmed,
    });
    setSubmitting(false);
    setDone(true);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_20px_48px_rgba(47,41,36,0.22)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/6 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#75825B]/12 text-[#75825B]">
              <BellIcon className="size-5" />
            </span>
            <h2
              id={titleId}
              className="font-heading text-lg font-semibold text-[#2f2924] sm:text-xl"
            >
              Strážiť dostupnosť
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavrieť"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/45 transition-colors hover:bg-[#faf8f5] hover:text-[#2f2924]"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center sm:px-6">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#75825B]/12 text-[#75825B]">
              <CheckCircle2 className="size-7" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-4 font-heading text-xl font-semibold text-[#2f2924]">
              Máme vás na zozname
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#2f2924]/60">
              Na adresu <span className="font-medium text-[#2f2924]">{email}</span>{" "}
              pošleme správu, hneď ako bude produkt znova na sklade.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Hotovo
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="px-5 py-5 sm:px-6 sm:py-6" noValidate>
            <div className="flex gap-3.5 rounded-2xl bg-[#faf8f5] p-3.5">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white sm:size-24">
                <Image
                  src={preview.image}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <p className="truncate font-heading text-base font-semibold text-[#2f2924]">
                  {product.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <span
                    className={`font-heading text-lg font-semibold ${
                      product.originalPrice ? "text-[#c45c4a]" : "text-[#2f2924]"
                    }`}
                  >
                    {product.price}
                  </span>
                  {product.originalPrice ? (
                    <span className="text-sm text-[#2f2924]/45 line-through">
                      {product.originalPrice}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-medium text-[#c45c4a]">
                  Momentálne nie je na sklade
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-[#2f2924]/65">
              Budeme vás informovať e-mailom, hneď ako bude produkt znova
              naskladnený.
            </p>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label
                  htmlFor="restock-email"
                  className="block text-sm font-medium text-[#2f2924]"
                >
                  E-mail
                </label>
                {accountEmail && emailLocked ? (
                  <button
                    type="button"
                    onClick={() => setEmailLocked(false)}
                    className="cursor-pointer text-xs font-medium text-[#75825B] transition-opacity hover:opacity-80"
                  >
                    Upraviť e-mail
                  </button>
                ) : null}
              </div>
              <input
                id="restock-email"
                type="email"
                autoComplete="email"
                className={fieldClass}
                value={email}
                disabled={emailLocked}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="vas@email.sk"
              />
            </div>

            {error ? (
              <p className="mt-3 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
            >
              <BellIcon className="size-4" />
              {submitting ? "Potvrdzujem…" : "Potvrdiť"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
