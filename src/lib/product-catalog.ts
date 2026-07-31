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
