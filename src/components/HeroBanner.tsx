import Image from "next/image";
import Link from "next/link";

export function HeroBanner() {
  return (
    <Link
      href="/"
      aria-label="Paci Dekor - domovská stránka"
      className="relative block aspect-[2/1] w-full cursor-pointer overflow-hidden rounded-3xl md:aspect-auto"
    >
      <Image
        src="/bannermobile.webp"
        alt="Paci Dekor"
        width={1200}
        height={600}
        priority
        quality={90}
        sizes="94vw"
        className="h-full w-full object-cover md:hidden"
      />
      <Image
        src="/banner1.webp"
        alt="Paci Dekor"
        width={1920}
        height={640}
        priority
        quality={90}
        sizes="80vw"
        className="hidden h-auto w-full object-cover md:block"
      />

      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2.5 sm:bottom-5">
        <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
        <span className="h-2 w-2 rounded-full bg-white/55 shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
        <span className="h-2 w-2 rounded-full bg-white/55 shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
      </div>
    </Link>
  );
}
