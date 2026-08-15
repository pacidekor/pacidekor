import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { CartButton } from "@/components/CartButton";
import { DesktopSearch } from "@/components/DesktopSearch";
import { FavoritesButton } from "@/components/FavoritesButton";
import { MobileHeader } from "@/components/MobileHeader";

export function Header() {
  return (
    <>
      <MobileHeader />

      <header className="relative z-30 hidden border-b border-black/8 bg-[#e8ebe2] md:block">
        <div className="mx-auto grid h-20 w-[var(--content-width)] grid-cols-[minmax(max-content,1fr)_minmax(0,42rem)_minmax(max-content,1fr)] items-center gap-4 lg:gap-6">
          <Link
            href="/"
            className="relative z-10 justify-self-start font-heading text-2xl tracking-[0.08em] text-foreground"
          >
            PACIDEKOR
          </Link>

          <div className="min-w-0 w-full justify-self-center">
            <DesktopSearch />
          </div>

          <div className="relative z-40 flex shrink-0 items-center justify-self-end gap-3">
            <AccountMenu />
            <FavoritesButton />
            <CartButton />
          </div>
        </div>
      </header>
    </>
  );
}
