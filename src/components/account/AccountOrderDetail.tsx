"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { formatPrice, parsePrice } from "@/lib/cart";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import { cancelCustomerOrderAction } from "@/lib/actions/orders";
import {
  ORDER_STATUS_META,
  ORDERS_EVENT,
  canCancelOrder,
  formatOrderCreatedAt,
  formatOrderShippingLine,
  formatOrderTotal,
  orderItemsSubtotal,
  orderStatusClass,
  type Order,
} from "@/lib/orders";
import { findCatalogProductById } from "@/lib/product-catalog";

export function AccountOrderDetail({
  order,
  customerEmail,
  allowCancel = false,
  onClose,
  onCancelled,
}: {
  order: Order;
  customerEmail: string;
  allowCancel?: boolean;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = ORDER_STATUS_META[order.status];
  const subtotal = orderItemsSubtotal(order);
  const panelOpen = entered && !exiting;
  const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const showCancel = allowCancel && canCancelOrder(order);

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
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 320);
  }

  async function handleCancel() {
    setCancelling(true);
    const result = await cancelCustomerOrderAction(order.id, customerEmail);
    setCancelling(false);
    if (!result.ok) return;
    window.dispatchEvent(new Event(ORDERS_EVENT));
    onCancelled?.();
    closePanel();
  }

  return (
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
        aria-labelledby="account-order-detail-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Detail objednávky
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h2
                id="account-order-detail-title"
                className="font-heading text-lg text-[#2f2924]"
              >
                #{order.id}
              </h2>
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${orderStatusClass(order.status)}`}
              >
                {meta.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#2f2924]/50">
              Objednané {formatOrderCreatedAt(order.createdAt)}
              <span className="text-[#2f2924]/35"> · {order.createdAtLabel}</span>
            </p>
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
          <section className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[#2f2924]">Produkty</p>
              <p className="mt-1 text-sm text-[#2f2924]/50">
                {order.items.length}{" "}
                {order.items.length === 1 ? "položka" : "položky"} · {itemCount}{" "}
                ks
              </p>
            </div>

            <ul className="space-y-2.5">
              {order.items.map((line) => {
                const product = findCatalogProductById(line.productId);
                const lineTotal = formatPrice(
                  parsePrice(line.unitPrice) * line.quantity,
                );
                const imageSrc = product?.image;

                return (
                  <li
                    key={`${order.id}-${line.productId}`}
                    className="flex items-center gap-3.5 rounded-xl border border-black/8 bg-[#faf8f5] px-3.5 py-3"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#e8ebe2]">
                      {imageSrc ? <ProductThumb src={imageSrc} /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#2f2924]">
                        {line.name}
                      </p>
                      {product?.sku ? (
                        <p className="mt-0.5 text-xs text-[#2f2924]/45">
                          {product.sku}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-[#2f2924]/55">
                        {line.quantity}× {line.unitPrice}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-[#2f2924]">
                      {lineTotal}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5">
              <div className="flex items-center justify-between text-sm text-[#2f2924]/65">
                <span>Medzisúčet</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#2f2924]/65">
                <span>Doprava</span>
                <span className="tabular-nums">{order.shippingCost}</span>
              </div>
              <div className="flex items-center justify-between border-t border-black/8 pt-2.5">
                <span className="text-sm font-semibold text-[#2f2924]">
                  Celkom
                </span>
                <span className="font-heading text-lg font-semibold tabular-nums text-[#2f2924]">
                  {formatOrderTotal(order)}
                </span>
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-5">
            <div>
              <p className="text-sm font-medium text-[#2f2924]">
                Dodacia adresa
              </p>
              <div className="mt-2 space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5">
                <InfoRow label="Príjemca">
                  {order.customer.company ? (
                    <>
                      {order.customer.company}
                      <span className="mt-0.5 block text-[#2f2924]/55">
                        {order.customer.name}
                      </span>
                    </>
                  ) : (
                    order.customer.name
                  )}
                </InfoRow>
                {order.customer.ico ? (
                  <InfoRow label="IČO">{order.customer.ico}</InfoRow>
                ) : null}
                <InfoRow label="Adresa">
                  <span className="block leading-relaxed">
                    {order.customer.street}
                    <br />
                    {order.customer.zip} {order.customer.city}
                    <br />
                    <span className="text-[#2f2924]/55">
                      {order.customer.country}
                    </span>
                  </span>
                </InfoRow>
                <InfoRow label="Telefón">{order.customer.phone}</InfoRow>
                <InfoRow label="E-mail">{order.customer.email}</InfoRow>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[#2f2924]">
                Platba a doprava
              </p>
              <div className="mt-2 space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3.5">
                <InfoRow label="Platba">{order.paymentMethod}</InfoRow>
                <InfoRow label="Doprava">
                  <span>
                    {order.shippingMethod}
                    {order.packetaPointName ? (
                      <>
                        <br />
                        <span className="text-[#2f2924]/70">
                          {order.packetaPointName}
                        </span>
                      </>
                    ) : null}
                  </span>
                </InfoRow>
                {order.note ? (
                  <InfoRow label="Poznámka">
                    <span className="leading-relaxed">{order.note}</span>
                  </InfoRow>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {showCancel ? (
          <div className="relative z-10 shrink-0 border-t border-black/6 bg-white px-4 py-4 sm:px-6">
            {confirmCancel ? (
              <div className="space-y-3">
                <p className="text-sm text-[#9a4d3f]">
                  Naozaj chcete stornovať objednávku #{order.id}?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                  >
                    Späť
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#c45c4a] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Potvrdiť storno
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#c45c4a] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Stornovať objednávku
              </button>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm text-[#2f2924]">{children}</div>
    </div>
  );
}

function ProductThumb({ src }: { src: string }) {
  if (src.startsWith("/")) {
    return (
      <Image src={src} alt="" fill sizes="56px" className="object-cover" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
  );
}
