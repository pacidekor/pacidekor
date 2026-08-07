"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ListFilter, Search } from "lucide-react";
import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";
import { FilterChip } from "@/components/FilterChip";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import {
  ORDER_STATUS_FILTERS,
  ORDER_STATUS_META,
  PENDING_ORDER_STATUSES,
  formatOrderTotal,
  getOrderById,
  orderCustomerLabel,
  orderStatusClass,
  orders,
  type OrderStatusFilterId,
} from "@/lib/orders";

export function AdminOrdersManager({
  initialOrderId,
  initialStatusFilter = "all",
}: {
  initialOrderId?: string;
  initialStatusFilter?: OrderStatusFilterId;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OrderStatusFilterId>(initialStatusFilter);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrderId && getOrderById(initialOrderId) ? initialOrderId : null,
  );

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

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
      if (statusFilter === "cakajuce") {
        if (!PENDING_ORDER_STATUSES.includes(order.status)) return false;
      } else if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
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
      <div className="mb-4 flex items-center gap-2.5 sm:gap-3">
        <div className="relative min-w-0 flex-[7] sm:max-w-md sm:flex-1">
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

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex h-11 min-w-0 flex-[3] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 sm:w-auto sm:flex-none sm:gap-2 sm:px-4 sm:ml-auto"
        >
          <ListFilter className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="truncate">Filtrovať</span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#75825B] text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
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

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        footer={
          <FilterSheetFooter
            hasActiveFilters={activeFilterCount > 0}
            onClear={() => setStatusFilter("all")}
            onDone={() => setFiltersOpen(false)}
          />
        }
      >
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
            Stav
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ORDER_STATUS_FILTERS.map((filter) => (
              <FilterChip
                key={filter.id}
                label={filter.label}
                active={statusFilter === filter.id}
                onClick={() => setStatusFilter(filter.id)}
              />
            ))}
          </div>
        </div>
      </FilterSheet>

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
