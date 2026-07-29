import { AdminMobileHeader } from "@/components/admin/AdminMobileHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-[#faf8f5] md:flex-row">
      <AdminMobileHeader />
      <AdminSidebar />
      <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
