"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const EXIT_MS = 350;

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer: ReactNode;
};

export function FilterSheet({
  open,
  onClose,
  title = "Filtre",
  children,
  footer,
}: FilterSheetProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [present, setPresent] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const show = window.setTimeout(() => setActive(true), 20);
      return () => window.clearTimeout(show);
    }

    setActive(false);
    const hide = window.setTimeout(() => setPresent(false), EXIT_MS);
    return () => window.clearTimeout(hide);
  }, [open]);

  useEffect(() => {
    if (!present) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [present]);

  if (!present) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Zavrieť filtre"
        onClick={onClose}
        className={`absolute inset-0 cursor-pointer bg-black/40 transition-opacity duration-[350ms] ease-out ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[1.75rem] border border-black/8 bg-white shadow-[0_-12px_40px_rgba(47,41,36,0.18)] transition-[transform,opacity] duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] sm:rounded-3xl sm:shadow-[0_20px_48px_rgba(47,41,36,0.2)] ${
          active
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-100 sm:translate-y-3 sm:opacity-0"
        }`}
      >
        <div
          className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-black/15 sm:hidden"
          aria-hidden
        />

        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/6 px-5 py-3.5 sm:px-6 sm:py-4">
          <h2 id={titleId} className="font-heading text-lg text-[#2f2924]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            aria-label="Zavrieť"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer}
      </div>
    </div>,
    document.body,
  );
}
