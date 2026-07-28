"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import {
  AccountChoiceCard,
  accountChoices,
} from "@/components/AccountTypeChoices";
import {
  clearClientSession,
  fetchClientCustomer,
  subscribeClientAuth,
  type ClientSession,
} from "@/lib/client-auth";
import { customerDisplayName } from "@/lib/customers";

type AccountSummary = {
  displayName: string;
  email: string;
  name: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ClientSession | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const menuId = useId();

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const customer = await fetchClientCustomer();
      if (cancelled) return;
      if (!customer) {
        setSession(null);
        setAccount(null);
        return;
      }
      setSession({ customerId: customer.id, type: customer.type });
      setAccount({
        displayName: customerDisplayName(customer),
        email: customer.email,
        name: customer.name,
      });
    }

    void sync();
    return subscribeClientAuth(() => {
      void sync();
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function logout() {
    await clearClientSession();
    setOpen(false);
    router.refresh();
  }

  if (session) {
    const displayName = account?.displayName ?? "Môj účet";
    const email = account?.email ?? "";
    const avatarName = account?.name || displayName;

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
          <span className="max-w-[10rem] truncate">{displayName}</span>
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
            aria-label="Účet"
            className="w-72 rounded-2xl bg-white p-3 shadow-[0_12px_36px_rgba(45,35,25,0.14)]"
          >
            <div className="flex items-center gap-3 rounded-xl bg-[#faf8f5] px-3 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8ebe2] font-heading text-xs font-semibold text-[#75825B]">
                {initials(avatarName) || "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2f2924]">
                  {displayName}
                </p>
                {email ? (
                  <p className="truncate text-xs text-[#2f2924]/55">{email}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <Link
                href="/ucet"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                <User className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Môj účet
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-black/8 px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Odhlásiť sa
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
