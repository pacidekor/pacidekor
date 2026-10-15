import type { Product } from "@/lib/products";

let catalog: Product[] = [];
const listeners = new Set<() => void>();

export function getProductCatalog(): Product[] {
  return catalog;
}

export function setProductCatalog(products: Product[]) {
  catalog = products;
  listeners.forEach((listener) => listener());
}

/** Merge a subset into the live catalog (cart / favorites without full layout payload). */
export function mergeProductsIntoCatalog(products: Product[]) {
  if (products.length === 0) return;
  const byId = new Map(catalog.map((product) => [product.id, product]));
  for (const product of products) {
    byId.set(product.id, product);
  }
  catalog = Array.from(byId.values());
  listeners.forEach((listener) => listener());
}

export function subscribeProductCatalog(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function findCatalogProductById(id: string) {
  return catalog.find((product) => product.id === id);
}

export function findCatalogProductsByIds(ids: string[]) {
  const idSet = new Set(ids);
  return catalog.filter((product) => idSet.has(product.id));
}

export function patchProductInCatalog(
  productId: string,
  patch: Partial<Product>,
) {
  const index = catalog.findIndex((product) => product.id === productId);
  if (index === -1) return;
  catalog = catalog.map((product, i) =>
    i === index ? { ...product, ...patch } : product,
  );
  listeners.forEach((listener) => listener());
}
