"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { accountChoices } from "@/components/AccountTypeChoices";
import { lockPageScroll } from "@/lib/lock-page-scroll";

type LoginRequiredModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginRequiredModal({ open, onClose }: LoginRequiredModalProps) {
  const titleId = useId();
  const router = useRouter();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const unlock = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      unlock();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
        className="relative z-10 w-full max-w-2xl rounded-3xl border border-black/8 bg-white p-6 shadow-[0_20px_48px_rgba(47,41,36,0.22)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="max-w-xl text-center font-heading text-xl font-semibold leading-snug text-[#2f2924] text-balance sm:text-left sm:text-2xl"
          >
            Pre túto funkciu sa musíte prihlásiť
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavrieť"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/45 transition-colors hover:bg-[#faf8f5] hover:text-[#2f2924]"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {accountChoices.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.title}
                className="flex flex-col items-center rounded-2xl bg-[#e8ebe2] px-5 py-6 text-center"
              >
                <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
                  <Icon
                    className="size-6"
                    strokeWidth={1.75}
                    style={{ color: option.accent }}
                    aria-hidden
                  />
                </span>
                <span className="font-heading text-base leading-snug text-[#2f2924]">
                  {option.title}
                </span>
                <span className="mt-1.5 text-sm leading-relaxed text-[#6b625a]">
                  {option.description}
                </span>
                <div className="mt-5 flex w-full flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(option.loginHref);
                    }}
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg text-xs font-medium tracking-wide text-white uppercase transition-opacity hover:opacity-90"
                    style={{ backgroundColor: option.accent }}
                  >
                    Prihlásiť sa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(option.registerHref);
                    }}
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border bg-white text-xs font-medium tracking-wide uppercase transition-opacity hover:opacity-80"
                    style={{
                      borderColor: `${option.accent}40`,
                      color: option.accent,
                    }}
                  >
                    Registrovať sa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
