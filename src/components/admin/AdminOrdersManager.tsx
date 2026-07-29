"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ListFilter, Search, X } from "lucide-react";
import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";
import {
  ORDER_STATUS_FILTERS,
  ORDER_STATUS_META,
  formatOrderTotal,
  getOrderById,
  orderCustomerLabel,
  orderStatusClass,
  orders,
  type OrderStatus,
} from "@/lib/orders";

export function AdminOrdersManager({
  initialOrderId,
}: {
  initialOrderId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrderId && getOrderById(initialOrderId) ? initialOrderId : null,
  );

  const selectedOrder = selectedId ? getOrderById(selectedId) : null;
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  function openOrder(id: string) {
    setSelectedId(id);
    router.replace(`/admin/objednavky?id=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function closeOrder() {
    setSelectedId(null);
    router.replace("/admin/objednavky", { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!q) return true;

      const haystack = [
        order.id,
        order.customer.name,
        order.customer.company,
        order.customer.email,
        order.customer.city,
        ORDER_STATUS_META[order.status].label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [query, statusFilter]);

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 sm:max-w-md sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hľadať podľa ID, mena, firmy…"
            className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
          />
        </div>

        <div className="flex w-full shrink-0 items-center gap-3 sm:ml-auto sm:w-auto">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 sm:flex-none"
          >
            <ListFilter className="size-4" strokeWidth={1.75} aria-hidden />
            Filtrovať
            {activeFilterCount > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#75825B] text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase sm:flex">
          <span className="w-[9.25rem] shrink-0">Objednávka</span>
          <span className="min-w-0 flex-1">Zákazník</span>
          <span className="w-16 shrink-0 text-right">Kusy</span>
          <span className="w-[10.5rem] shrink-0 pl-8">Stav</span>
          <span className="w-[4.75rem] shrink-0 text-right">Suma</span>
          <span className="w-4 shrink-0" aria-hidden />
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-[#2f2924]">
              Žiadne objednávky
            </p>
            <p className="mt-1 text-sm text-[#2f2924]/50">
              Skúste zmeniť filter alebo vyhľadávanie.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {filtered.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              const pieces = order.items.reduce(
                (sum, line) => sum + line.quantity,
                0,
              );

              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => openOrder(order.id)}
                    className="flex w-full cursor-pointer flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-[#faf8f5] sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 sm:w-[9.25rem] sm:shrink-0">
                      <p className="font-medium text-[#2f2924]">#{order.id}</p>
                      <p className="mt-0.5 text-xs text-[#2f2924]/45">
                        {order.createdAtLabel}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#2f2924]">
                        {orderCustomerLabel(order)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#2f2924]/45">
                        {order.customer.city}
                        {order.customer.company
                          ? ` · ${order.customer.name}`
                          : ""}
                      </p>
                    </div>

                    <p className="hidden w-16 shrink-0 text-right text-sm tabular-nums text-[#2f2924]/70 sm:block">
                      {pieces} ks
                    </p>

                    <div className="flex items-center justify-between gap-3 sm:contents">
                      <div className="sm:w-[10.5rem] sm:shrink-0 sm:pl-8">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${orderStatusClass(order.status)}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <p className="text-sm font-semibold tabular-nums text-[#2f2924] sm:w-[4.75rem] sm:shrink-0 sm:text-right">
                        {formatOrderTotal(order)}
                      </p>
                    </div>

                    <ChevronRight
                      className="hidden size-4 shrink-0 text-[#2f2924]/25 sm:block"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label="Zavrieť filtre"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-[0_16px_48px_rgba(47,41,36,0.16)]">
            <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
              <h2 className="font-heading text-lg text-[#2f2924]">Filtre</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
                aria-label="Zavrieť"
              >
                <X className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm font-medium text-[#2f2924]">Stav</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ORDER_STATUS_FILTERS.map((filter) => {
                  const active = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      className={`inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#75825B] text-white"
                          : "border border-black/10 bg-[#faf8f5] text-[#2f2924]/70 hover:border-[#75825B]/40"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/6 px-5 py-4">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="cursor-pointer text-sm font-medium text-[#2f2924]/55 transition-colors hover:text-[#2f2924]"
              >
                Zrušiť filtre
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Použiť
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedOrder ? (
        <AdminOrderDetail
          key={selectedOrder.id}
          order={selectedOrder}
          onClose={closeOrder}
        />
      ) : null}
    </div>
  );
}
