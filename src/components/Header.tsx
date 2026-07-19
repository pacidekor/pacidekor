import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { CartButton } from "@/components/CartButton";
import { DesktopSearch } from "@/components/DesktopSearch";
import { MobileHeader } from "@/components/MobileHeader";

export function Header() {
  return (
    <>
      <MobileHeader />

      <header className="relative z-30 hidden border-b border-black/8 bg-[#e8ebe2] md:block">
        <div className="relative mx-auto flex h-20 w-[var(--content-width)] items-center">
          <Link
            href="/"
            className="relative z-10 font-heading text-2xl tracking-[0.08em] text-foreground"
          >
            PACIDEKOR
          </Link>

          <DesktopSearch />

          <div className="relative z-40 ml-auto flex items-center gap-3">
            <AccountMenu />
            <CartButton count={0} />
          </div>
        </div>
      </header>
    </>
  );
}
