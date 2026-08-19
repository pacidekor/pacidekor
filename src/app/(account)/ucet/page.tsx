import type { Metadata } from "next";
import { ClientAccountSettings } from "@/components/account/ClientAccountSettings";
import { createCustomerClient } from "@/lib/supabase/server";
import { listOrdersForCustomerEmail } from "@/lib/orders.server";
import type { Order } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Môj účet",
  description: "Nastavenie účtu, objednávky a šablóny PACIDEKOR.",
};

export default async function UcetPage() {
  let initialOrders: Order[] | undefined;

  try {
    const supabase = await createCustomerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profile &&
        profile.role !== "admin" &&
        profile.status === "aktivny" &&
        profile.email
      ) {
        initialOrders = await listOrdersForCustomerEmail(profile.email);
      }
    }
  } catch {
    // Client-side fetch will retry after hydration.
  }

  return <ClientAccountSettings initialOrders={initialOrders} />;
}
