import { redirect } from "next/navigation";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/objednavky?id=${encodeURIComponent(id)}`);
}
