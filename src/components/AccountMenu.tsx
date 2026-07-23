"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import {
  AccountChoiceCard,
  accountChoices,
} from "@/components/AccountTypeChoices";

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
          className="w-[min(34rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 shadow-[0_12px_36px_rgba(45,35,25,0.14)]"
        >
          <p className="mb-4 text-center font-heading text-base text-[#2f2924]">
            Vyberte typ účtu
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {accountChoices.map((option) => (
              <AccountChoiceCard
                key={option.title}
                option={option}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
