"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Layers, X } from "lucide-react";
import type { CartItem } from "@/lib/cart";
import { createOrderTemplate } from "@/lib/order-templates";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

type SaveCartTemplateModalProps = {
  open: boolean;
  onClose: () => void;
  customerId: string;
  items: CartItem[];
};

export function SaveCartTemplateModal({
  open,
  onClose,
  customerId,
  items,
}: SaveCartTemplateModalProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName("");
    setNote("");
    setError(null);
    setSaving(false);
    setDone(false);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Zadajte názov šablóny.");
      return;
    }
    if (items.length === 0) {
      setError("Košík je prázdny.");
      return;
    }

    setSaving(true);
    setError(null);
    createOrderTemplate({
      customerId,
      name,
      note,
      items: items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
    });
    setSaving(false);
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
              <Layers className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <h2
              id={titleId}
              className="font-heading text-lg font-semibold text-[#2f2924] sm:text-xl"
            >
              Uložiť ako šablónu
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
              Šablóna je uložená
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#2f2924]/60">
              Nájdete ju v účte v sekcii Šablóny a nabudúce ju môžete spustiť
              odtiaľ.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/ucet"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Prejsť do účtu
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/8 bg-white px-5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
              >
                Zavrieť
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="px-5 py-5 sm:px-6 sm:py-6"
            noValidate
          >
            <p className="text-sm leading-relaxed text-[#2f2924]/65">
              Uložíme aktuálny košík ({items.length}{" "}
              {items.length === 1
                ? "položka"
                : items.length < 5
                  ? "položky"
                  : "položiek"}
              ) ako šablónu pre opakované objednávky.
            </p>

            <div className="mt-4">
              <label
                htmlFor="template-name"
                className="mb-1.5 block text-sm font-medium text-[#2f2924]"
              >
                Názov šablóny
              </label>
              <input
                id="template-name"
                className={fieldClass}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="Napr. Týždenný sortiment"
                autoFocus
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="template-note"
                className="mb-1.5 block text-sm font-medium text-[#2f2924]"
              >
                Poznámka{" "}
                <span className="font-normal text-[#2f2924]/40">
                  (voliteľné)
                </span>
              </label>
              <textarea
                id="template-note"
                rows={2}
                className="w-full resize-y rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Napr. základná dodávka pre prevádzku"
              />
            </div>

            {error ? (
              <p className="mt-3 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
            >
              {saving ? "Ukladám…" : "Uložiť šablónu"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
