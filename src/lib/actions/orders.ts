"use server";

import { revalidatePath } from "next/cache";
import {
  createPacketaPacket,
  fetchPacketaLabelPdfBase64,
} from "@/lib/packeta-api";
import {
  ACTIVE_ORDER_STATUSES,
  CANCELLABLE_ORDER_STATUSES,
  canPrintShippingLabel,
  orderTotal,
  type Order,
} from "@/lib/orders";
import {
  getOrderByDbIdFromDb,
  getOrderByNumberFromDb,
  listOrdersForCustomerEmail,
  listOrdersFromDb,
} from "@/lib/orders.server";
import { meetsMinOrder, parsePrice } from "@/lib/price";
import { normalizePromoCode, promoDiscountAmount } from "@/lib/promo";
import {
  FREE_SHIPPING_THRESHOLD,
  PAYMENT_OPTIONS,
  SHIPPING_OPTIONS,
  type PaymentMethodId,
  type ShippingMethodId,
} from "@/lib/shipping";
import { createAdminClient, createCustomerClient, createServiceClient } from "@/lib/supabase/server";

export type OrderActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CreateOrderLineInput = {
  productId: string;
  quantity: number;
  colorId?: string;
};

export type CreateOrderInput = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  ico?: string;
  dic?: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  note?: string;
  shippingMethod: ShippingMethodId;
  paymentMethod: PaymentMethodId;
  packetaPointId?: string;
  packetaPointName?: string;
  promoCode?: string;
  items: CreateOrderLineInput[];
};

async function requireAdmin() {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Nie ste prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Nemáte oprávnenie administrátora." };
  }

  return { ok: true as const, user };
}

function initialStatusForPayment(paymentMethod: PaymentMethodId) {
  return paymentMethod === "transfer" ? "nezaplatena" : "nova";
}

function validateCreateOrderInput(input: CreateOrderInput): string | null {
  if (!input.name.trim()) return "Zadajte meno a priezvisko.";
  if (!input.email.trim() || !input.email.includes("@")) {
    return "Zadajte platný e-mail.";
  }
  if (!input.phone.trim()) return "Zadajte telefón.";
  if (!input.street.trim()) return "Zadajte ulicu a číslo.";
  if (!input.city.trim()) return "Zadajte mesto.";
  if (!input.zip.trim()) return "Zadajte PSČ.";
  if (!input.country.trim()) return "Zadajte krajinu.";
  if (!input.items.length) return "Košík je prázdny.";
  if (
    input.shippingMethod === "packeta_point" &&
    !input.packetaPointId?.trim()
  ) {
    return "Vyberte výdajné miesto Packeta / Zásielkovňa.";
  }
  if (
    !SHIPPING_OPTIONS.some((option) => option.id === input.shippingMethod)
  ) {
    return "Neplatný spôsob dopravy.";
  }
  if (!PAYMENT_OPTIONS.some((option) => option.id === input.paymentMethod)) {
    return "Neplatný spôsob platby.";
  }
  return null;
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<OrderActionResult<{ orderNumber: string }>> {
  const validationError = validateCreateOrderInput(input);
  if (validationError) return { ok: false, error: validationError };

  let db;
  try {
    db = createServiceClient();
  } catch {
    return { ok: false, error: "Objednávku momentálne nie je možné uložiť." };
  }

  const supabase = await createCustomerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.role !== "admin" && profile.status === "aktivny") {
      userId = user.id;
    }
  }

  const productIds = [...new Set(input.items.map((line) => line.productId))];
  const { data: products, error: productsError } = await db
    .from("products")
    .select("id, name, price, in_stock, stock_quantity")
    .in("id", productIds);

  if (productsError) {
    return { ok: false, error: productsError.message };
  }

  const productMap = new Map(
    (products ?? []).map((product) => [product.id, product] as const),
  );

  const orderLines: Array<{
    productId: string;
    productName: string;
    unitPrice: string;
    quantity: number;
    colorId?: string;
  }> = [];

  let subtotal = 0;

  for (const line of input.items) {
    const product = productMap.get(line.productId);
    if (!product) {
      return { ok: false, error: "Jeden z produktov v košíku už neexistuje." };
    }

    const quantity = Math.max(1, Math.floor(line.quantity));
    if (!product.in_stock) {
      return { ok: false, error: `${product.name} nie je na sklade.` };
    }
    if (
      product.stock_quantity != null &&
      product.stock_quantity < quantity
    ) {
      return {
        ok: false,
        error: `Nedostatok skladu pre ${product.name}.`,
      };
    }

    const unitPrice = product.price;
    subtotal += parsePrice(unitPrice) * quantity;
    orderLines.push({
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity,
      colorId: line.colorId?.trim() || undefined,
    });
  }

  if (!meetsMinOrder(subtotal)) {
    return {
      ok: false,
      error: "Minimálna hodnota objednávky nie je splnená.",
    };
  }

  let discount = 0;
  let promoCode: string | null = null;

  const normalizedPromo = normalizePromoCode(input.promoCode ?? "");
  if (normalizedPromo) {
    const { data: promo, error: promoError } = await db
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedPromo)
      .maybeSingle();

    if (promoError) {
      return { ok: false, error: "Overenie zľavového kódu zlyhalo." };
    }
    if (!promo || !promo.active) {
      return { ok: false, error: "Zľavový kód nie je platný." };
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    if (promo.starts_at && promo.starts_at > todayIso) {
      return { ok: false, error: "Zľavový kód ešte nie je aktívny." };
    }
    if (promo.ends_at && promo.ends_at < todayIso) {
      return { ok: false, error: "Zľavový kód už vypršal." };
    }
    if (
      typeof promo.max_uses === "number" &&
      promo.used_count >= promo.max_uses
    ) {
      return { ok: false, error: "Zľavový kód bol vyčerpaný." };
    }

    const minOrder =
      promo.min_order_eur == null ? 0 : Number(promo.min_order_eur);
    if (minOrder > 0 && subtotal < minOrder) {
      return {
        ok: false,
        error: `Zľavový kód platí od ${minOrder.toFixed(2).replace(".", ",")} €.`,
      };
    }

    discount = promoDiscountAmount(subtotal, promo.discount_percent);
    promoCode = promo.code;
  }

  const afterDiscount = Math.max(0, subtotal - discount);
  const shippingOption = SHIPPING_OPTIONS.find(
    (option) => option.id === input.shippingMethod,
  );
  const shippingCost =
    afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : (shippingOption?.cost ?? 0);
  const total = afterDiscount + shippingCost;

  const { data: orderNumber, error: numberError } = await db.rpc(
    "next_order_number",
  );

  if (numberError || !orderNumber) {
    return {
      ok: false,
      error: numberError?.message ?? "Nepodarilo sa vygenerovať číslo objednávky.",
    };
  }

  const { data: orderRow, error: orderError } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: userId,
      status: initialStatusForPayment(input.paymentMethod),
      customer_name: input.name.trim(),
      customer_email: input.email.trim(),
      customer_phone: input.phone.trim(),
      customer_company: input.company?.trim() || null,
      customer_ico: input.ico?.trim() || null,
      customer_dic: input.dic?.trim() || null,
      customer_street: input.street.trim(),
      customer_city: input.city.trim(),
      customer_zip: input.zip.trim(),
      customer_country: input.country.trim() || "Slovensko",
      note: input.note?.trim() || null,
      shipping_method: input.shippingMethod,
      payment_method: input.paymentMethod,
      packeta_point_id: input.packetaPointId?.trim() || null,
      packeta_point_name: input.packetaPointName?.trim() || null,
      subtotal_eur: subtotal,
      discount_eur: discount,
      promo_code: promoCode,
      shipping_cost_eur: shippingCost,
      total_eur: total,
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    return {
      ok: false,
      error: orderError?.message ?? "Uloženie objednávky zlyhalo.",
    };
  }

  const { error: itemsError } = await db.from("order_items").insert(
    orderLines.map((line) => ({
      order_id: orderRow.id,
      product_id: line.productId,
      product_name: line.productName,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      color_id: line.colorId ?? null,
    })),
  );

  if (itemsError) {
    await db.from("orders").delete().eq("id", orderRow.id);
    return { ok: false, error: itemsError.message };
  }

  for (const line of orderLines) {
    const { error: stockError } = await db.rpc("adjust_product_stock", {
      p_product_id: line.productId,
      p_delta: -line.quantity,
    });

    if (stockError) {
      return {
        ok: false,
        error: `Objednávka bola uložená, ale sklad sa nepodarilo upraviť: ${stockError.message}`,
      };
    }
  }

  if (promoCode) {
    const { data: promo } = await db
      .from("promo_codes")
      .select("used_count")
      .eq("code", promoCode)
      .maybeSingle();

    if (promo) {
      await db
        .from("promo_codes")
        .update({
          used_count: promo.used_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("code", promoCode);
    }
  }

  if (userId) {
    await db.from("cart_items").delete().eq("user_id", userId);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/objednavky");
  revalidatePath("/ucet");

  return { ok: true, data: { orderNumber } };
}

export async function listAdminOrdersAction(): Promise<
  OrderActionResult<Order[]>
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const orders = await listOrdersFromDb();
    return { ok: true, data: orders };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Načítanie objednávok zlyhalo.",
    };
  }
}

export async function listCustomerOrdersAction(
  email: string,
): Promise<OrderActionResult<Order[]>> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: true, data: [] };

  try {
    const orders = await listOrdersForCustomerEmail(normalized);
    return { ok: true, data: orders };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Načítanie objednávok zlyhalo.",
    };
  }
}

export async function cancelCustomerOrderAction(
  orderNumber: string,
  customerEmail: string,
): Promise<OrderActionResult> {
  let db;
  try {
    db = createServiceClient();
  } catch {
    return { ok: false, error: "Storno momentálne nie je dostupné." };
  }

  const order = await getOrderByNumberFromDb(orderNumber);
  if (!order) return { ok: false, error: "Objednávka sa nenašla." };

  if (
    order.customer.email.trim().toLowerCase() !==
    customerEmail.trim().toLowerCase()
  ) {
    return { ok: false, error: "Objednávku nemôžete zrušiť." };
  }

  if (!CANCELLABLE_ORDER_STATUSES.includes(order.status)) {
    return { ok: false, error: "Túto objednávku už nie je možné zrušiť." };
  }

  const { error } = await db
    .from("orders")
    .update({
      status: "stornovana",
      note: "Zákazník zrušil objednávku.",
    })
    .eq("order_number", orderNumber);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/objednavky");
  revalidatePath("/ucet");
  return { ok: true, data: undefined };
}

export async function printPacketaLabelAction(
  orderNumber: string,
): Promise<OrderActionResult<{ pdfBase64: string; packetId: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const order = await getOrderByNumberFromDb(orderNumber);
  if (!order?.dbId) {
    return { ok: false, error: "Objednávka sa nenašla." };
  }
  if (!canPrintShippingLabel(order)) {
    return {
      ok: false,
      error: "Pre tento stav objednávky nie je možné tlačiť štítok.",
    };
  }
  if (order.shippingMethodId !== "packeta_point") {
    return {
      ok: false,
      error: "Štítok Packeta je dostupný len pre výdajné miesto.",
    };
  }
  if (!order.packetaPointId) {
    return { ok: false, error: "Objednávka nemá vybrané výdajné miesto." };
  }

  let db;
  try {
    db = createServiceClient();
  } catch {
    return { ok: false, error: "Packeta API nie je nakonfigurované." };
  }

  let packetId = order.packetaPacketId;

  try {
    if (!packetId) {
      const created = await createPacketaPacket({
        orderNumber: order.id,
        customerName: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        company: order.customer.company,
        addressId: order.packetaPointId,
        valueEur: orderTotal(order),
        codEur: order.paymentMethodId === "cod" ? orderTotal(order) : 0,
        note: order.note,
      });
      packetId = created.packetId;

      await db
        .from("orders")
        .update({
          packeta_packet_id: packetId,
          status:
            order.status === "zaplatena" ||
            order.status === "pripravuje_sa" ||
            order.status === "pripravena_na_odoslanie"
              ? order.status
              : "pripravena_na_odoslanie",
        })
        .eq("id", order.dbId);
    }

    const pdfBase64 = await fetchPacketaLabelPdfBase64(packetId);
    revalidatePath("/admin/objednavky");
    return { ok: true, data: { pdfBase64, packetId } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Vytvorenie Packeta štítku zlyhalo.",
    };
  }
}

export async function getOrderByNumberAction(
  orderNumber: string,
): Promise<OrderActionResult<Order>> {
  try {
    const order = await getOrderByNumberFromDb(orderNumber);
    if (!order) return { ok: false, error: "Objednávka sa nenašla." };
    return { ok: true, data: order };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Načítanie objednávky zlyhalo.",
    };
  }
}

export async function getActiveCustomerOrdersAction(
  email: string,
): Promise<OrderActionResult<Order[]>> {
  const result = await listCustomerOrdersAction(email);
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.filter((order) =>
      ACTIVE_ORDER_STATUSES.includes(order.status),
    ),
  };
}

export async function getCustomerOrderHistoryAction(
  email: string,
): Promise<OrderActionResult<Order[]>> {
  const result = await listCustomerOrdersAction(email);
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.filter(
      (order) => !ACTIVE_ORDER_STATUSES.includes(order.status),
    ),
  };
}
