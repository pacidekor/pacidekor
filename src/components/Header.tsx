import Link from "next/link";
import { Search } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { CartButton } from "@/components/CartButton";

export function Header() {
  return (
    <header className="relative z-30 border-b border-black/8 bg-[#e8ebe2]">
      <div className="relative mx-auto flex h-20 w-[var(--content-width)] items-center">
        <Link
          href="/"
          className="relative z-10 font-heading text-2xl tracking-[0.08em] text-foreground"
        >
          PACIDEKOR
        </Link>

        <form
          role="search"
          className="absolute left-1/2 w-[min(42rem,46%)] -translate-x-1/2"
        >
          <label htmlFor="site-search" className="sr-only">
            Hľadať
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/40"
              aria-hidden
            />
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="Hľadať produkty…"
              className="h-11 w-full rounded-xl border border-black/10 bg-white/70 pr-4 pl-10 text-sm text-foreground outline-none placeholder:text-foreground/40 transition-colors focus:border-[#75825B] focus:bg-white focus:ring-2 focus:ring-[#75825B]/20"
            />
          </div>
        </form>

        <div className="relative z-40 ml-auto flex items-center gap-3">
          <AccountMenu />
          <CartButton count={0} />
        </div>
      </div>
    </header>
  );
}
