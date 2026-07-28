import { AdminCustomersManager } from "@/components/admin/AdminCustomersManager";
import { listCustomers } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminZakazniciPage() {
  const result = await listCustomers();
  const customers = result.ok ? result.data.customers : [];

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminCustomersManager initialCustomers={customers} />
    </main>
  );
}
