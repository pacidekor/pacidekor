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
