"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ShoppingBag, Shield, User } from "lucide-react";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={menuId}
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-white px-3.5 text-sm text-[#3d342c] transition-colors hover:bg-white/90"
      >
        <User className="size-4 shrink-0" aria-hidden />
        <span>Prihlásenie / Registrácia</span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <div
        className={`absolute top-full right-0 pt-2 transition-all duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div
          id={menuId}
          role="dialog"
          aria-hidden={!open}
          aria-label="Vyberte typ účtu"
          className="w-[min(28rem,calc(100vw-2rem))] rounded-xl bg-white p-4 shadow-[0_12px_36px_rgba(45,35,25,0.14)]"
        >
          <p className="mb-3 text-center font-heading text-sm text-[#2f2924]">
            Vyberte typ účtu
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <AccountChoice
              accent="#8f2555"
              softBg="#f7ebe8"
              icon={<Shield className="size-4" strokeWidth={1.75} />}
              title="Som kvetinárka / firma"
              description="Veľkoobchodné ceny a partnerské výhody"
              loginHref="/prihlasenie/velkoobchod"
              registerHref="/registracia/velkoobchod"
            />
            <AccountChoice
              accent="#3f6b4d"
              softBg="#f3efe9"
              icon={<ShoppingBag className="size-4" strokeWidth={1.75} />}
              title="Nakupujem pre seba"
              description="Maloobchodný nákup pre bežných zákazníkov"
              loginHref="/prihlasenie"
              registerHref="/registracia"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountChoice({
  accent,
  softBg,
  icon,
  title,
  description,
  loginHref,
  registerHref,
}: {
  accent: string;
  softBg: string;
  icon: ReactNode;
  title: string;
  description: string;
  loginHref: string;
  registerHref: string;
}) {
  return (
    <div
      className="flex flex-col items-center rounded-lg px-3 py-3.5 text-center"
      style={{ backgroundColor: softBg }}
    >
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-white shadow-sm">
        <span style={{ color: accent }}>{icon}</span>
      </div>

      <h3 className="font-heading text-xs leading-snug text-[#2f2924]">
        {title}
      </h3>
      <p className="mt-1 mb-3 text-[11px] leading-relaxed text-[#6b625a]">
        {description}
      </p>

      <div className="mt-auto flex w-full flex-col gap-1.5">
        <Link
          href={loginHref}
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-2.5 text-[11px] font-medium tracking-wide text-white uppercase transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          Prihlásiť sa
        </Link>
        <Link
          href={registerHref}
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-black/12 bg-white px-2.5 text-[11px] font-medium tracking-wide text-[#2f2924] uppercase transition-colors hover:bg-[#faf8f5]"
        >
          Registrovať sa
        </Link>
      </div>
    </div>
  );
}
