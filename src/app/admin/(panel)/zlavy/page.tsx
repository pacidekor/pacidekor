import { AdminDiscountsManager } from "@/components/admin/AdminDiscountsManager";
import { listDiscountsAction } from "@/lib/actions/discounts";

export const dynamic = "force-dynamic";

/** Async fetch so route `loading.tsx` paints during navigation. */
export default async function AdminZlavyPage() {
  await listDiscountsAction();

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminDiscountsManager />
    </main>
  );
}
