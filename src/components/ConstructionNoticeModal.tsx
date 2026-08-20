"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { fetchClientCustomer } from "@/lib/client-auth";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import { SHOW_CONSTRUCTION_NOTICE } from "@/lib/shop-flags";

export { SHOW_CONSTRUCTION_NOTICE };

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
          <h2
            id={titleId}
            className="text-center font-heading text-2xl font-semibold uppercase leading-tight text-[#2f2924] text-balance sm:text-3xl"
          >
            Nakupovanie ešte nie je spustené
          </h2>

          <p className="mt-4 text-center text-[15px] leading-relaxed text-[#2f2924]/70 text-pretty">
            {isWholesalePartner ? (
              <>
                Na e-shope PACIDEKOR práve pracujeme. Objednávky a platby zatiaľ
                nie sú aktívne. Váš veľkoobchodný účet je pripravený - hneď ako
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
