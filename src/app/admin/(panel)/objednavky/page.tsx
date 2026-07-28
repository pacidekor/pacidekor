import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminOrdersManager } from "@/components/admin/AdminOrdersManager";

export default async function AdminObjednavkyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminPageHeader
        title="Objednávky"
        description="Prehľad všetkých objednávok, ich stavov a detailov."
      />
      <AdminOrdersManager initialOrderId={id} />
    </main>
  );
}
