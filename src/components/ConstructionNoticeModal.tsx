"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { fetchClientCustomer } from "@/lib/client-auth";
import { lockPageScroll } from "@/lib/lock-page-scroll";

/** Dočasně vypnuté pro prezentaci klientovi. Zapnout znovu: true */
export const SHOW_CONSTRUCTION_NOTICE = false;

function ToolsIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M11.4194 15.1694L17.25 21C18.2855 22.0355 19.9645 22.0355 21 21C22.0355 19.9645 22.0355 18.2855 21 17.25L15.1233 11.3733M11.4194 15.1694L13.9155 12.1383C14.2315 11.7546 14.6542 11.5132 15.1233 11.3733M11.4194 15.1694L6.76432 20.8219C6.28037 21.4096 5.55897 21.75 4.79768 21.75C3.39064 21.75 2.25 20.6094 2.25 19.2023C2.25 18.441 2.59044 17.7196 3.1781 17.2357L10.0146 11.6056M15.1233 11.3733C15.6727 11.2094 16.2858 11.1848 16.8659 11.2338C16.9925 11.2445 17.1206 11.25 17.25 11.25C19.7353 11.25 21.75 9.23528 21.75 6.75C21.75 6.08973 21.6078 5.46268 21.3523 4.89779L18.0762 8.17397C16.9605 7.91785 16.0823 7.03963 15.8262 5.92397L19.1024 2.64774C18.5375 2.39223 17.9103 2.25 17.25 2.25C14.7647 2.25 12.75 4.26472 12.75 6.75C12.75 6.87938 12.7555 7.00749 12.7662 7.13411C12.8571 8.20956 12.6948 9.39841 11.8617 10.0845L11.7596 10.1686M10.0146 11.6056L5.90901 7.5H4.5L2.25 3.75L3.75 2.25L7.5 4.5V5.90901L11.7596 10.1686M10.0146 11.6056L11.7596 10.1686M18.375 18.375L15.75 15.75M4.86723 19.125H4.87473V19.1325H4.86723V19.125Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConstructionNoticeModal() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isWholesalePartner, setIsWholesalePartner] = useState(false);

  useEffect(() => {
    if (!SHOW_CONSTRUCTION_NOTICE) return;

    let cancelled = false;

    async function show() {
      setMounted(true);
      const customer = await fetchClientCustomer();
      if (cancelled) return;

      setIsWholesalePartner(customer?.type === "velkoobchod");
      setOpen(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setVisible(true);
        });
      });
    }

    void show();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    return lockPageScroll();
  }, [open]);

  function dismiss() {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
    }, 220);
  }

  if (!SHOW_CONSTRUCTION_NOTICE) return null;
  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
        visible ? "bg-[#2f2924]/55" : "bg-[#2f2924]/0"
      }`}
      style={{ backdropFilter: visible ? "blur(6px)" : "blur(0px)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-[#faf8f5] shadow-[0_28px_64px_rgba(47,41,36,0.35)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.98] opacity-0"
        }`}
      >
        <div className="px-6 py-8 sm:px-9 sm:py-10">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#e8ebe2] text-[#75825B]">
            <ToolsIcon className="size-7" />
          </div>

          <h2
            id={titleId}
            className="mt-5 text-center font-heading text-2xl font-semibold leading-tight text-[#2f2924] text-balance sm:text-3xl"
          >
            Nakupovanie ešte nie je spustené
          </h2>

          <p className="mt-4 text-center text-[15px] leading-relaxed text-[#2f2924]/70 text-pretty">
            {isWholesalePartner ? (
              <>
                Na e-shope PACIDEKOR práve pracujeme. Objednávky a platby zatiaľ
                nie sú aktívne. Váš veľkoobchodný účet je pripravený — hneď ako
                e-shop oficiálne spustíme, budete môcť nakupovať.
              </>
            ) : (
              <>
                Na e-shope PACIDEKOR práve pracujeme. Objednávky a platby zatiaľ
                nie sú aktívne. Už teraz si však môžete vytvoriť{" "}
                <span className="font-medium text-[#2f2924]">
                  veľkoobchodnú registráciu
                </span>{" "}
                a byť pripravení, keď e-shop oficiálne spustíme.
              </>
            )}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {!isWholesalePartner ? (
              <Link
                href="/registracia/velkoobchod"
                onClick={dismiss}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#75825B] px-5 py-3.5 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Registrovať veľkoobchodný účet
              </Link>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className={`inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl px-5 py-3.5 text-sm font-medium transition-opacity ${
                isWholesalePartner
                  ? "bg-[#75825B] text-white hover:opacity-90"
                  : "min-h-11 border border-black/10 py-3 text-[#2f2924] hover:bg-white"
              }`}
            >
              Pokračovať na e-shop
            </button>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-[#2f2924]/45">
            Hneď ako bude e-shop oficiálne spustený, informujeme všetkých
            registrovaných zákazníkov e-mailom.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
