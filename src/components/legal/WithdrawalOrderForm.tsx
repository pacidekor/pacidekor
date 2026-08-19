"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getOrderByNumberAction } from "@/lib/actions/orders";
import {
  formatOrderTotal,
  ORDER_STATUS_META,
  type Order,
} from "@/lib/orders";
import { formatPrice, parsePrice } from "@/lib/price";

const WITHDRAWAL_STORAGE_KEY = "pacidekor-withdrawal-requests";

const inputClassName =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

function readWithdrawalIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WITHDRAWAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function saveWithdrawalId(orderId: string) {
  const next = Array.from(new Set([...readWithdrawalIds(), orderId]));
  window.localStorage.setItem(WITHDRAWAL_STORAGE_KEY, JSON.stringify(next));
}

function normalizeOrderId(value: string) {
  return value.trim().replace(/^#/, "");
}

export function WithdrawalOrderForm() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [withdrawnIds, setWithdrawnIds] = useState<string[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setWithdrawnIds(readWithdrawalIds());
  }, []);

  const alreadyWithdrawn =
    order !== null &&
    (order.status === "stornovana" || withdrawnIds.includes(order.id));

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitted(false);
    setConfirmOpen(false);

    const id = normalizeOrderId(orderId);
    const normalizedEmail = email.trim().toLowerCase();

    if (!id || !normalizedEmail) {
      setOrder(null);
      setError("Vyplňte číslo objednávky aj e-mail.");
      return;
    }

    setLookupLoading(true);
    const result = await getOrderByNumberAction(id);
    setLookupLoading(false);

    if (
      !result.ok ||
      result.data.customer.email.toLowerCase() !== normalizedEmail
    ) {
      setOrder(null);
      setError(
        "Objednávku sme nenašli. Skontrolujte číslo objednávky a e-mail uvedený v objednávke.",
      );
      return;
    }

    setOrder(result.data);
  }

  function handleWithdraw() {
    if (!order) return;
    saveWithdrawalId(order.id);
    setWithdrawnIds(readWithdrawalIds());
    setConfirmOpen(false);
    setSubmitted(true);
  }

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-5 sm:p-6">
      <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
        Nájsť objednávku
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[#2f2924]/65">
        Zadajte číslo objednávky a e-mail, ktorý ste použili pri nákupe. Potom
        môžete požiadať o odstúpenie od zmluvy alebo storno.
      </p>

      <form
        onSubmit={handleLookup}
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium tracking-wide text-[#2f2924]/55 uppercase">
            Číslo objednávky
          </span>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="napr. 2026-00124"
            autoComplete="off"
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium tracking-wide text-[#2f2924]/55 uppercase">
            E-mail z objednávky
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.sk"
            autoComplete="email"
            className={inputClassName}
          />
        </label>

        <button
          type="submit"
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
        >
          Zobraziť objednávku
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
          {error}
        </p>
      ) : null}

      {order ? (
        <div className="mt-6 border-t border-black/6 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase">
                Objednávka
              </p>
              <p className="mt-1 font-heading text-lg font-semibold text-[#2f2924]">
                #{order.id}
              </p>
              <p className="mt-0.5 text-sm text-[#2f2924]/55">
                {new Date(order.createdAt).toLocaleDateString("sk-SK")} ·{" "}
                {order.customer.name}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_META[order.status].className}`}
            >
              {ORDER_STATUS_META[order.status].label}
            </span>
          </div>

          <ul className="mt-5 space-y-2.5">
            {order.items.map((line) => (
              <li
                key={`${order.id}-${line.productId}`}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <span className="min-w-0 text-[#2f2924]/80">
                  {line.name}
                  <span className="text-[#2f2924]/45"> × {line.quantity}</span>
                </span>
                <span className="shrink-0 font-medium text-[#2f2924]">
                  {formatPrice(parsePrice(line.unitPrice) * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1 border-t border-black/6 pt-4 text-sm">
            <div className="flex justify-between gap-4 text-[#2f2924]/65">
              <span>Doprava ({order.shippingMethod})</span>
              <span>{order.shippingCost}</span>
            </div>
            <div className="flex justify-between gap-4 text-[#2f2924]/65">
              <span>Platba</span>
              <span>{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 text-base font-semibold text-[#2f2924]">
              <span>Celkom</span>
              <span>{formatOrderTotal(order)}</span>
            </div>
          </div>

          {submitted || alreadyWithdrawn ? (
            <div className="mt-5 rounded-xl border border-[#75825B]/25 bg-[#75825B]/8 px-4 py-3 text-sm leading-relaxed text-[#2f2924]/80">
              {order.status === "stornovana" && !submitted ? (
                <>Táto objednávka je už stornovaná.</>
              ) : (
                <>
                  Žiadosť o odstúpenie od zmluvy / storno objednávky{" "}
                  <strong>#{order.id}</strong> sme prijali. Ozveme sa vám na{" "}
                  {order.customer.email}.
                </>
              )}
            </div>
          ) : (
            <div className="mt-5">
              {!confirmOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#c45c4a]/35 bg-white px-5 text-sm font-medium text-[#9a4d3f] transition-colors hover:bg-[#f3e8e6] sm:w-auto"
                >
                  Odstúpiť od zmluvy
                </button>
              ) : (
                <div className="rounded-2xl border border-[#c45c4a]/25 bg-[#faf8f5] p-4">
                  <p className="text-sm leading-relaxed text-[#2f2924]/75">
                    Naozaj chcete požiadať o odstúpenie od zmluvy / storno
                    objednávky <strong>#{order.id}</strong>?
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleWithdraw}
                      className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c45c4a] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Áno, odstúpiť
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(false)}
                      className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#f3f1ed]"
                    >
                      Zrušiť
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
