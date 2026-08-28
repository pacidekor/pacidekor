import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { formatPrice, parsePrice } from "@/lib/price";
import { productCountLabel } from "@/lib/product-count";
import { findCatalogProductById } from "@/lib/product-catalog";
import { productHref } from "@/lib/products";
import {
  ORDER_STATUS_META,
  formatOrderCreatedAt,
  formatOrderShippingLine,
  formatOrderTotal,
  orderItemsSubtotal,
  orderStatusClass,
  type Order,
} from "@/lib/orders";

export function PublicOrderDetail({ order }: { order: Order }) {
  const meta = ORDER_STATUS_META[order.status];
  const subtotal =
    typeof order.subtotalEur === "number"
      ? order.subtotalEur
      : orderItemsSubtotal(order);
  const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const hasDiscount =
    typeof order.discountEur === "number" && order.discountEur > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(16rem,1fr)] lg:items-start lg:gap-8">
      <div className="space-y-6">
        <section
          aria-labelledby="order-items-heading"
          className="overflow-hidden rounded-3xl border border-black/6 bg-white"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/6 px-5 py-5 sm:px-7">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
                Objednávka {order.id}
              </p>
              <h2
                id="order-items-heading"
                className="mt-1 font-heading text-xl font-semibold text-[#2f2924] sm:text-2xl"
              >
                Položky objednávky
              </h2>
              <p className="mt-1 text-sm text-[#2f2924]/55">
                Objednané {formatOrderCreatedAt(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${orderStatusClass(order.status)}`}
              >
                {meta.label}
              </span>
              <p className="text-sm text-[#2f2924]/55">
                {productCountLabel(itemCount)}
              </p>
            </div>
          </div>

          <ul className="divide-y divide-black/6 px-5 sm:px-7">
            {order.items.map((line) => {
              const product = findCatalogProductById(line.productId);
              const lineTotal = parsePrice(line.unitPrice) * line.quantity;
              const imageSrc = product?.image;
              const category = product?.category;
              const href = product ? productHref(product.slug) : null;

              return (
                <li
                  key={`${order.id}-${line.productId}-${line.colorId ?? ""}`}
                  className="flex items-center gap-3.5 py-5 sm:gap-5"
                >
                  {href ? (
                    <Link
                      href={href}
                      prefetch={false}
                      className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#f3efe9] sm:size-28"
                    >
                      <ProductThumb src={imageSrc} />
                    </Link>
                  ) : (
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#f3efe9] sm:size-28">
                      <ProductThumb src={imageSrc} />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {href ? (
                          <Link
                            href={href}
                            prefetch={false}
                            className="block truncate font-heading text-base font-semibold leading-snug text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-lg"
                          >
                            {line.name}
                          </Link>
                        ) : (
                          <p className="truncate font-heading text-base font-semibold leading-snug text-[#2f2924] sm:text-lg">
                            {line.name}
                          </p>
                        )}
                        {category ? (
                          <p className="mt-1 truncate text-sm text-[#2f2924]/55">
                            {category}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 font-heading text-lg font-semibold tabular-nums text-[#2f2924]">
                        {formatPrice(lineTotal)}
                      </p>
                    </div>

                    <p className="mt-3 text-sm text-[#2f2924]/60">
                      {line.quantity}&nbsp;× {line.unitPrice}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="overflow-hidden rounded-3xl border border-black/6 bg-white">
          <div className="border-b border-black/6 px-5 py-5 sm:px-7">
            <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
              Dodacie údaje
            </h2>
            <p className="mt-1 text-sm text-[#2f2924]/55">
              Príjemca, adresa a kontakt
            </p>
          </div>
          <div className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-7 sm:py-6">
            <InfoBlock label="Príjemca">
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
            </InfoBlock>
            {order.customer.ico ? (
              <InfoBlock label="IČO">{order.customer.ico}</InfoBlock>
            ) : null}
            <InfoBlock label="Adresa">
              <span className="block leading-relaxed">
                {order.customer.street}
                <br />
                {order.customer.zip} {order.customer.city}
                <br />
                <span className="text-[#2f2924]/55">
                  {order.customer.country}
                </span>
              </span>
            </InfoBlock>
            <div className="space-y-4">
              <InfoBlock label="Telefón">{order.customer.phone}</InfoBlock>
              <InfoBlock label="E-mail">{order.customer.email}</InfoBlock>
            </div>
            {order.note ? (
              <div className="sm:col-span-2">
                <InfoBlock label="Poznámka">
                  <span className="leading-relaxed">{order.note}</span>
                </InfoBlock>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-[calc(5rem+3.5rem)]">
        <div className="overflow-hidden rounded-3xl border border-black/6 bg-white">
          <div className="border-b border-black/6 px-6 py-5 sm:px-7">
            <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
              Súhrn objednávky
            </h2>
            <p className="mt-1 text-sm text-[#2f2924]/55">
              {productCountLabel(itemCount)}
            </p>
          </div>

          <div className="space-y-3.5 px-6 py-5 sm:px-7">
            <SummaryRow label="Medzisúčet" value={formatPrice(subtotal)} />

            {hasDiscount ? (
              <SummaryRow
                label={`Zľava${order.promoCode ? ` (${order.promoCode})` : ""}`}
                value={`-${formatPrice(order.discountEur!)}`}
              />
            ) : null}

            <SummaryRow label="Doprava" value={order.shippingCost} />

            <div className="space-y-2 rounded-2xl bg-[#faf8f5] px-3.5 py-3">
              <p className="text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase">
                Platba
              </p>
              <p className="text-sm text-[#2f2924]">{order.paymentMethod}</p>
              <p className="pt-1 text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase">
                Doprava
              </p>
              <p className="text-sm leading-snug text-[#2f2924]">
                {formatOrderShippingLine(order)}
              </p>
            </div>

            <div className="h-px bg-black/8" aria-hidden />

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-[#2f2924]">Celkom</span>
              <span className="font-heading text-2xl font-semibold tabular-nums text-[#2f2924]">
                {formatOrderTotal(order)}
              </span>
            </div>
          </div>

          <div className="border-t border-black/6 px-6 py-5 sm:px-7">
            <Link
              href="/"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/8 bg-white text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
            >
              <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
              Prejsť do obchodu
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-[#2f2924]/60">{label}</span>
      <span className="font-medium tabular-nums text-[#2f2924]">{value}</span>
    </div>
  );
}

function InfoBlock({
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

function ProductThumb({ src }: { src?: string }) {
  if (!src) return null;
  if (src.startsWith("/")) {
    return (
      <Image src={src} alt="" fill sizes="112px" quality={90} className="object-cover" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
  );
}
