"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronRight, ListFilter, Search } from "lucide-react";
import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";
import { FilterChip } from "@/components/FilterChip";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import { fetchAdminOrder } from "@/lib/admin-order-fetch";
import {
  ORDER_STATUS_FILTERS,
  ORDER_STATUS_META,
  PENDING_ORDER_STATUSES,
  formatOrderTotal,
  getOrderById,
  orderCustomerLabel,
  orderStatusClass,
  type Order,
  type OrderStatusFilterId,
} from "@/lib/orders";

const PAGE_SIZE = 40;

function syncOrderIdInUrl(orderId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (orderId) url.searchParams.set("id", orderId);
  else url.searchParams.delete("id");
  window.history.replaceState(window.history.state, "", url.pathname + url.search);
}

function orderPieces(order: Order) {
  if (typeof order.itemCount === "number") return order.itemCount;
  return order.items.reduce((sum, line) => sum + line.quantity, 0);
}

export function AdminOrdersManager({
  orders: initialOrders,
  initialOrderId,
  initialStatusFilter = "all",
}: {
  orders: Order[];
  initialOrderId?: string;
  initialStatusFilter?: OrderStatusFilterId;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OrderStatusFilterId>(initialStatusFilter);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrderId && getOrderById(initialOrders, initialOrderId)
      ? initialOrderId
      : null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetailOrder(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    void fetchAdminOrder(selectedId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        window.alert(result.error);
        setSelectedId(null);
        syncOrderIdInUrl(null);
        setDetailLoading(false);
        return;
      }
      setDetailOrder(result.data);
      setOrders((prev) => {
        const index = prev.findIndex((order) => order.id === result.data.id);
        if (index === -1) return prev;
        const copy = [...prev];
        copy[index] = {
          ...prev[index]!,
          ...result.data,
          itemCount:
            result.data.itemCount ??
            result.data.items.reduce((sum, line) => sum + line.quantity, 0),
        };
        return copy;
      });
      setDetailLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  function openOrder(id: string) {
    setSelectedId(id);
    syncOrderIdInUrl(id);
  }

  function closeOrder() {
    setSelectedId(null);
    setDetailOrder(null);
    syncOrderIdInUrl(null);
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
  }, [orders, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

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
          className="inline-flex h-11 min-w-0 flex-[3] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 sm:ml-auto sm:w-auto sm:flex-none sm:gap-2 sm:px-4"
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
            {pageItems.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              const pieces = orderPieces(order);

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

      {filtered.length > PAGE_SIZE ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#2f2924]/55">
            {filtered.length} objednávok · strana {safePage} / {pageCount}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Predchádzajúca
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ďalšia
            </button>
          </div>
        </div>
      ) : null}

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

      {detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2f2924]/25 backdrop-blur-[1px]">
          <div className="rounded-2xl bg-white px-6 py-5 shadow-lg">
            <div className="mx-auto h-9 w-9 animate-pulse rounded-full bg-[#75825B]/25" />
            <p className="mt-3 text-sm text-[#2f2924]/65">
              Načítavam objednávku…
            </p>
          </div>
        </div>
      ) : null}

      {detailOrder && !detailLoading ? (
        <AdminOrderDetail
          key={detailOrder.id}
          order={detailOrder}
          onClose={closeOrder}
        />
      ) : null}
    </div>
  );
}
