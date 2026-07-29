"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  Building2,
  Check,
  ChevronRight,
  ListFilter,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  approveCustomer,
  blockCustomer,
  deleteCustomer,
  listCustomers,
  rejectCustomer,
  restoreCustomerRequest,
  unblockCustomer,
} from "@/lib/actions/auth";
import {
  CUSTOMER_STATUS_META,
  CUSTOMER_TYPE_META,
  customerDisplayName,
  type Customer,
  type CustomerStatus,
  type CustomerType,
} from "@/lib/customers";
import { lockPageScroll } from "@/lib/lock-page-scroll";

type StatusFilter = "all" | CustomerStatus;
type TypeFilter = "all" | CustomerType;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Všetky stavy" },
  { id: "aktivny", label: "Aktívni" },
  { id: "ziada_registraciu", label: "Žiadajú registráciu" },
  { id: "zamietnuty", label: "Zamietnutí" },
  { id: "zablokovany", label: "Zablokovaní" },
];

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "Všetky účty" },
  { id: "maloobchod", label: "Maloobchod" },
  { id: "velkoobchod", label: "Veľkoobchod" },
];

export function AdminCustomersManager({
  initialCustomers = [],
  initialTypeFilter = "all",
}: {
  initialCustomers?: Customer[];
  initialTypeFilter?: TypeFilter;
}) {
  const [list, setList] = useState<Customer[]>(initialCustomers);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialTypeFilter);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    let cancelled = false;

    async function refresh() {
      const result = await listCustomers();
      if (cancelled || !result.ok) return;
      setList(result.data.customers);
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = selectedId
    ? (list.find((customer) => customer.id === selectedId) ?? null)
    : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return list.filter((customer) => {
      if (statusFilter !== "all" && customer.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && customer.type !== typeFilter) {
        return false;
      }
      if (!q) return true;

      const haystack = [
        customer.name,
        customer.company,
        customer.email,
        customer.phone,
        customer.city,
        customer.ico,
        CUSTOMER_TYPE_META[customer.type].label,
        CUSTOMER_STATUS_META[customer.status].label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [list, query, statusFilter, typeFilter]);

  const pendingCount = list.filter(
    (customer) => customer.status === "ziada_registraciu",
  ).length;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  function showFlash(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 2400);
  }

  function applyCustomerUpdate(customer: Customer) {
    setList((prev) =>
      prev.map((item) => (item.id === customer.id ? customer : item)),
    );
  }

  async function runStatusAction(
    action: () => Promise<
      | { ok: true; data: { customer: Customer } }
      | { ok: false; error: string }
    >,
    successMessage: string,
  ) {
    const result = await action();
    if (!result.ok) {
      showFlash(result.error);
      return;
    }
    applyCustomerUpdate(result.data.customer);
    showFlash(successMessage);
  }

  function approveRegistration(id: string) {
    void runStatusAction(() => approveCustomer(id), "Registrácia bola schválená");
  }

  function rejectRegistration(id: string) {
    void runStatusAction(() => rejectCustomer(id), "Žiadosť bola zamietnutá");
  }

  function blockCustomerById(id: string) {
    void runStatusAction(() => blockCustomer(id), "Účet bol zablokovaný");
  }

  function unblockCustomerById(id: string) {
    void runStatusAction(() => unblockCustomer(id), "Účet bol odblokovaný");
  }

  function reviveCustomer(id: string) {
    void runStatusAction(() => approveCustomer(id), "Účet bol obnovený");
  }

  function restoreRequest(id: string) {
    void runStatusAction(
      () => restoreCustomerRequest(id),
      "Žiadosť bola obnovená",
    );
  }

  async function deleteCustomerById(id: string) {
    const result = await deleteCustomer(id);
    if (!result.ok) {
      showFlash(result.error);
      return;
    }
    setList((prev) => prev.filter((item) => item.id !== id));
    setSelectedId(null);
    showFlash("Účet bol zmazaný");
  }

  function clearFilters() {
    setStatusFilter("all");
    setTypeFilter(initialTypeFilter);
  }

  const pendingFilterActive =
    statusFilter === "ziada_registraciu" && typeFilter === "velkoobchod";

  function togglePendingFilter() {
    if (pendingFilterActive) {
      setStatusFilter("all");
      setTypeFilter(initialTypeFilter);
      return;
    }
    setStatusFilter("ziada_registraciu");
    setTypeFilter("velkoobchod");
    setFiltersOpen(false);
  }

  if (!hydrated) {
    return (
      <div>
        <div className="h-16 animate-pulse rounded-2xl bg-white/60" />
        <div className="mt-5 h-64 animate-pulse rounded-2xl bg-white/60" />
      </div>
    );
  }

  return (
    <div>
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
          Zákazníci
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
          Prehľad maloobchodných a veľkoobchodných účtov a žiadostí o
          registráciu.
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-4 flex flex-col gap-3">
          <div className="relative w-full min-w-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hľadať podľa mena, firmy, e-mailu…"
              className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={togglePendingFilter}
                aria-pressed={pendingFilterActive}
                className={`inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors sm:w-auto ${
                  pendingFilterActive
                    ? "border-[#75825B] bg-[#e8ebe2] text-[#5f6a49]"
                    : "border-[#c2410c]/20 bg-[#ffedd5]/60 text-[#c2410c] hover:bg-[#ffedd5]"
                }`}
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#c2410c] text-[11px] leading-none font-semibold text-white">
                  {pendingCount}
                </span>
                Čaká na vybavenie
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 sm:ml-auto sm:w-auto"
            >
              <ListFilter className="size-4" strokeWidth={1.75} aria-hidden />
              Filtrovať
              {activeFilterCount > 0 ? (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#75825B] text-[11px] leading-none font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase sm:flex">
            <span className="min-w-0 flex-1">Zákazník</span>
            <span className="w-[7.5rem] shrink-0">Typ</span>
            <span className="w-[9.5rem] shrink-0">Stav</span>
            <span className="w-4 shrink-0" aria-hidden />
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm font-medium text-[#2f2924]">
                Žiadni zákazníci
              </p>
              <p className="mt-1 text-sm text-[#2f2924]/50">
                {list.length === 0
                  ? "Zatiaľ sa neregistroval žiadny zákazník."
                  : "Skúste zmeniť filter alebo vyhľadávanie."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {filtered.map((customer) => {
                const typeMeta = CUSTOMER_TYPE_META[customer.type];
                const statusMeta = CUSTOMER_STATUS_META[customer.status];

                return (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(customer.id)}
                      className="flex w-full cursor-pointer flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-[#faf8f5] sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-[#2f2924]">
                          {customerDisplayName(customer)}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-[#2f2924]/50">
                          {customer.company
                            ? `${customer.name} · ${customer.email}`
                            : customer.email}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:contents">
                        <div className="sm:w-[7.5rem] sm:shrink-0">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${typeMeta.className}`}
                          >
                            {typeMeta.label}
                          </span>
                        </div>
                        <div className="sm:w-[9.5rem] sm:shrink-0">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
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
      </div>

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

            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="text-sm font-medium text-[#2f2924]">Stav</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((filter) => {
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

              <div>
                <p className="text-sm font-medium text-[#2f2924]">Typ účtu</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TYPE_FILTERS.map((filter) => {
                    const active = typeFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setTypeFilter(filter.id)}
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
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/6 px-5 py-4">
              <button
                type="button"
                onClick={clearFilters}
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

      {selected ? (
        <CustomerDetail
          key={selected.id}
          customer={selected}
          onClose={() => setSelectedId(null)}
          onApprove={() => approveRegistration(selected.id)}
          onReject={() => rejectRegistration(selected.id)}
          onBlock={() => blockCustomerById(selected.id)}
          onUnblock={() => unblockCustomerById(selected.id)}
          onRevive={() => reviveCustomer(selected.id)}
          onRestoreRequest={() => restoreRequest(selected.id)}
          onDelete={() => void deleteCustomerById(selected.id)}
        />
      ) : null}

      <div
        aria-live="polite"
        className={`fixed right-5 bottom-5 z-[60] transition-all duration-300 ${
          flash
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="inline-flex items-center gap-2.5 rounded-xl bg-[#75825B] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgba(47,41,36,0.18)]">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/15">
            <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
          </span>
          {flash}
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({
  customer,
  onClose,
  onApprove,
  onReject,
  onBlock,
  onUnblock,
  onRevive,
  onRestoreRequest,
  onDelete,
}: {
  customer: Customer;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onRevive: () => void;
  onRestoreRequest: () => void;
  onDelete: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirm, setConfirm] = useState<"block" | "delete" | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelOpen = entered && !exiting;

  const typeMeta = CUSTOMER_TYPE_META[customer.type];
  const statusMeta = CUSTOMER_STATUS_META[customer.status];
  const isPending =
    customer.type === "velkoobchod" &&
    customer.status === "ziada_registraciu";
  const isRejected = customer.status === "zamietnuty";
  const isBlocked = customer.status === "zablokovany";
  const isActive = customer.status === "aktivny";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unlock = lockPageScroll();

    const enterFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });

    return () => {
      cancelAnimationFrame(enterFrame);
      unlock();
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function closePanel() {
    if (exiting) return;
    setConfirm(null);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 320);
  }

  function runAndClose(action: () => void) {
    action();
    closePanel();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        panelOpen ? "bg-black/30" : "bg-black/0"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť"
        onClick={closePanel}
      />
      <aside
        className={`relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-detail-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Detail zákazníka
            </p>
            <h2
              id="customer-detail-title"
              className="mt-1 truncate font-heading text-lg text-[#2f2924]"
            >
              {customerDisplayName(customer)}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${typeMeta.className}`}
              >
                {typeMeta.label}
              </span>
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            aria-label="Zavrieť"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-5">
            {isPending ? (
              <div className="rounded-xl border border-[#c2410c]/15 bg-[#ffedd5]/40 px-4 py-3.5">
                <p className="text-sm font-medium text-[#c2410c]">
                  Žiadosť o veľkoobchodnú registráciu
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#2f2924]/65">
                  Skontrolujte údaje a schváľte registráciu, alebo zákazníka
                  najprv kontaktujte. Po schválení bude môcť nakupovať za
                  veľkoobchodné ceny.
                </p>
              </div>
            ) : null}

            {isRejected ? (
              <div className="rounded-xl border border-[#b91c1c]/15 bg-[#fee2e2]/50 px-4 py-3.5">
                <p className="text-sm font-medium text-[#b91c1c]">
                  Zamietnutá žiadosť
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#2f2924]/65">
                  Účet môžete obnoviť a schváliť, alebo vrátiť späť medzi
                  žiadosti na opätovné posúdenie.
                </p>
              </div>
            ) : null}

            {isBlocked ? (
              <div className="rounded-xl border border-black/10 bg-[#f3f4f6] px-4 py-3.5">
                <p className="text-sm font-medium text-[#4b5563]">
                  Zablokovaný účet
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#2f2924]/65">
                  Zákazník sa nemôže prihlásiť ani nakupovať. Účet môžete
                  odblokovať alebo natrvalo zmazať.
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-medium text-[#2f2924]">Kontakt</p>
              <div className="mt-2 space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5">
                <InfoRow
                  icon={
                    customer.company ? (
                      <Building2 className="size-4" aria-hidden />
                    ) : (
                      <User className="size-4" aria-hidden />
                    )
                  }
                  label={customer.company ? "Firma" : "Meno"}
                >
                  {customerDisplayName(customer)}
                  {customer.company ? (
                    <span className="mt-0.5 block text-[#2f2924]/55">
                      {customer.name}
                    </span>
                  ) : null}
                </InfoRow>

                <InfoRow
                  icon={<Mail className="size-4" aria-hidden />}
                  label="E-mail"
                >
                  <a
                    href={`mailto:${customer.email}`}
                    className="transition-colors hover:text-[#75825B]"
                  >
                    {customer.email}
                  </a>
                </InfoRow>

                <InfoRow
                  icon={<Phone className="size-4" aria-hidden />}
                  label="Telefón"
                >
                  <a
                    href={`tel:${customer.phone.replace(/\s/g, "")}`}
                    className="transition-colors hover:text-[#75825B]"
                  >
                    {customer.phone}
                  </a>
                </InfoRow>
              </div>
            </div>

            {(customer.ico || customer.dic) && (
              <div>
                <p className="text-sm font-medium text-[#2f2924]">
                  Firemné údaje
                </p>
                <div className="mt-2 space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5">
                  {customer.ico ? (
                    <InfoRow label="IČO">{customer.ico}</InfoRow>
                  ) : null}
                  {customer.dic ? (
                    <InfoRow label="DIČ">{customer.dic}</InfoRow>
                  ) : null}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-[#2f2924]">Adresa</p>
              <div className="mt-2 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5 text-sm leading-relaxed text-[#2f2924]">
                <p>{customer.street}</p>
                <p>
                  {customer.zip} {customer.city}
                </p>
                <p className="text-[#2f2924]/55">{customer.country}</p>
              </div>
            </div>

            {customer.note ? (
              <div>
                <p className="text-sm font-medium text-[#2f2924]">Poznámka</p>
                <div className="mt-2 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5 text-sm leading-relaxed text-[#2f2924]">
                  {customer.note}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-medium text-[#2f2924]">História</p>
              <div className="mt-2 space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5">
                <InfoRow label="Vytvorené">{customer.createdAtLabel}</InfoRow>
                {customer.registeredAtLabel ? (
                  <InfoRow label="Registrovaný">
                    {customer.registeredAtLabel}
                  </InfoRow>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 shrink-0 space-y-2.5 border-t border-black/6 bg-white px-4 py-4 sm:px-6">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => runAndClose(onApprove)}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Check className="size-4" strokeWidth={2} aria-hidden />
                Schváliť registráciu
              </button>
              <div className="flex gap-2.5">
                <a
                  href={`mailto:${customer.email}?subject=${encodeURIComponent("Veľkoobchodná registrácia – PACIDEKOR")}`}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                >
                  <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                  Kontaktovať
                </a>
                <button
                  type="button"
                  onClick={() => runAndClose(onReject)}
                  className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-[#c45c4a]/30 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
                >
                  Zamietnuť
                </button>
              </div>
            </>
          ) : null}

          {isRejected ? (
            <>
              <button
                type="button"
                onClick={() => runAndClose(onRevive)}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Check className="size-4" strokeWidth={2} aria-hidden />
                Obnoviť a schváliť
              </button>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => runAndClose(onRestoreRequest)}
                  className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                >
                  <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />
                  Vrátiť medzi žiadosti
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm("delete")}
                  className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c45c4a]/30 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                  Zmazať
                </button>
              </div>
            </>
          ) : null}

          {isBlocked ? (
            <>
              <button
                type="button"
                onClick={() => runAndClose(onUnblock)}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />
                Odblokovať účet
              </button>
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c45c4a]/30 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
              >
                <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                Zmazať účet
              </button>
            </>
          ) : null}

          {isActive ? (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirm("block")}
                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                <Ban className="size-4" strokeWidth={1.75} aria-hidden />
                Zablokovať
              </button>
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c45c4a]/30 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
              >
                <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                Zmazať účet
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {confirm ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-confirm-title"
            className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
          >
            <h3
              id="customer-confirm-title"
              className="font-heading text-lg text-[#2f2924]"
            >
              {confirm === "block" ? "Zablokovať účet?" : "Zmazať účet?"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
              {confirm === "block"
                ? "Zákazník sa nebude môcť prihlásiť ani nakupovať, kým účet znova neodblokujete."
                : "Účet sa natrvalo odstráni. Túto akciu nie je možné vrátiť späť."}
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={() =>
                  runAndClose(confirm === "block" ? onBlock : onDelete)
                }
                className={`inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 ${
                  confirm === "block" ? "bg-[#2f2924]" : "bg-[#c45c4a]"
                }`}
              >
                {confirm === "block" ? "Zablokovať" : "Zmazať"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function InfoRow({
  label,
  children,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className={icon ? "flex gap-3" : undefined}>
      {icon ? (
        <span className="mt-0.5 shrink-0 text-[#75825B]">{icon}</span>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase">
          {label}
        </p>
        <div className="mt-1 text-sm text-[#2f2924]">{children}</div>
      </div>
    </div>
  );
}
