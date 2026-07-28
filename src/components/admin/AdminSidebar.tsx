"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { adminNavItems } from "@/lib/admin-nav";
import { setAdminAuthenticated } from "@/lib/admin-auth";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    setAdminAuthenticated(false);
    router.replace("/admin/login");
  }

  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-black/[0.06] bg-white">
      <div className="flex shrink-0 items-center justify-center px-5 py-7">
        <Link
          href="/admin"
          className="font-heading text-2xl tracking-[0.08em] text-foreground transition-opacity hover:opacity-80"
        >
          PACIDEKOR
        </Link>
      </div>

      <nav
        aria-label="Administrácia"
        className="flex min-h-0 flex-1 flex-col px-3 pb-5"
      >
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {adminNavItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors ${
                    active
                      ? "bg-[#75825B] font-medium text-white"
                      : "text-[#2f2924]/70 hover:bg-[#faf8f5] hover:text-[#2f2924]"
                  }`}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1 truncate">{label}</span>
                  {active ? (
                    <ChevronRight className="size-4 shrink-0 opacity-80" aria-hidden />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 shrink-0 border-t border-black/[0.06] pt-4">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8ebe2] font-heading text-xs font-semibold text-[#75825B]">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem] font-medium text-[#2f2924]">
                Administrátor
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Odhlásiť sa"
              title="Odhlásiť sa"
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/55 transition-colors hover:bg-[#faf8f5] hover:text-[#2f2924]"
            >
              <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
