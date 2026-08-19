import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminOrdersManager } from "@/components/admin/AdminOrdersManager";
import { isValidOrderStatusFilter } from "@/lib/orders";
import { listOrdersFromDb } from "@/lib/orders.server";

export const dynamic = "force-dynamic";

export default async function AdminObjednavkyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; status?: string }>;
}) {
  const { id, status } = await searchParams;
  const initialStatusFilter = isValidOrderStatusFilter(status) ? status : "all";
  const orders = await listOrdersFromDb();

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminPageHeader
        title="Objednávky"
        description="Prehľad všetkých objednávok, ich stavov a detailov."
      />
      <AdminOrdersManager
        orders={orders}
        initialOrderId={id}
        initialStatusFilter={initialStatusFilter}
      />
    </main>
  );
}
