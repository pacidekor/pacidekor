import type { Metadata } from "next";
import Image from "next/image";
import { AdminGuestGate } from "@/components/admin/AdminAuthGate";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: {
    absolute: "Prihlásenie | Administrácia | PACIDEKOR",
  },
};

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <Image
        src="/lgnbackground.webp"
        alt=""
        fill
        priority
        quality={90}
        sizes="100vw"
        className="object-cover"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[#2f2924]/25"
        aria-hidden
      />
      <div className="relative z-10 flex flex-1 flex-col">
        <AdminGuestGate>
          <AdminLoginForm />
        </AdminGuestGate>
      </div>
    </div>
  );
}
