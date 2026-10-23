/** Select cards before mapping their galleries, colors and stock information. */
export function getRelatedProducts<T extends { slug?: string }>(
  allProducts: T[],
  slug: string,
  count = 4,
): T[] {
  const others = allProducts.filter((product) => product.slug !== slug);
  const start = allProducts.findIndex((product) => product.slug === slug);
  const offset = start >= 0 ? start % Math.max(others.length, 1) : 0;
  const related: T[] = [];

  for (let i = 0; i < Math.min(count, others.length); i++) {
    related.push(others[(offset + i) % others.length]);
  }

  return related;
}
