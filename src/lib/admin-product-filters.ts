export type AdminStockFilter = "all" | "in" | "out" | "low" | "attention";

const STOCK_FILTER_VALUES: AdminStockFilter[] = [
  "all",
  "in",
  "out",
  "low",
  "attention",
];

export function isValidStockFilter(
  value: string | undefined,
): value is AdminStockFilter {
  return STOCK_FILTER_VALUES.includes(value as AdminStockFilter);
}
