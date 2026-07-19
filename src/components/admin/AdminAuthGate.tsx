"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";

function AuthLoading() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="h-10 w-10 animate-pulse rounded-full bg-[#75825B]/25" />
    </main>
  );
}

/** Protects /admin — redirects unauthenticated users to /admin/login. */
export function AdminAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace("/admin/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) return <AuthLoading />;
  return children;
}

/** For /admin/login — redirects already authenticated users to /admin. */
export function AdminGuestGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.replace("/admin");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) return <AuthLoading />;
  return children;
}
