import type { Metadata } from "next";
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
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(117,130,91,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(232,235,226,0.9), transparent 50%)",
        }}
      />
      <div className="relative z-10 flex flex-1 flex-col">
        <AdminGuestGate>
          <AdminLoginForm />
        </AdminGuestGate>
      </div>
    </div>
  );
}
