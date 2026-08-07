/** Slovak plural for product counts: 0/5+ produktov, 1 produkt, 2–4 produkty. */
export function productCountLabel(count: number) {
  const n = Math.max(0, Math.floor(count));
  if (n === 1) return "1 produkt";
  if (n >= 2 && n <= 4) return `${n} produkty`;
  return `${n} produktov`;
}
