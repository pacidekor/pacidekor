import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

/** Instant feedback while a panel route's data is loading. */
export default function AdminPanelLoading() {
  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminPageHeader
        title="Načítavam…"
        description="Chvíľku strpenia."
      />
      <div className="mt-6 space-y-3">
        <div className="h-11 animate-pulse rounded-xl bg-[#e8ebe2]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[#e8ebe2]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[#e8ebe2]" />
      </div>
    </main>
  );
}
