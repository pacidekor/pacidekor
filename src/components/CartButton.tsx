import Link from "next/link";
import { ShoppingCart } from "lucide-react";

type CartButtonProps = {
  count?: number;
};

export function CartButton({ count = 0 }: CartButtonProps) {
  return (
    <Link
      href="/kosik"
      aria-label={`Košík, ${count} položiek`}
      className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white text-[#3d342c] transition-colors hover:bg-white/90"
    >
      <ShoppingCart className="size-5" strokeWidth={1.75} aria-hidden />
      <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#75825B] px-1 text-[11px] font-semibold leading-none text-white">
        {count}
      </span>
    </Link>
  );
}
