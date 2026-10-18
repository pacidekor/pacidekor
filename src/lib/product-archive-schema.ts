/**
 * Detects PostgREST/Postgres errors that mean archive columns are not migrated yet.
 * Must NOT match timeouts, permission, network, or other DB failures — those must
 * fail closed (no unfiltered catalog), never fall back to legacy select.
 */
export function isArchiveSchemaMissing(
  message: string | undefined,
  code?: string | null,
): boolean {
  if (!message) return false;

  // Fail closed: never treat operational errors as "column missing".
  if (
    /timeout|timed out|permission denied|not authorized|jwt|rls|network|ECONN|ENOTFOUND|fetch failed|502|503|504|57014|canceling statement/i.test(
      message,
    )
  ) {
    return false;
  }
  if (
    code &&
    /^(57014|PGRST301|PGRST302|42501|28P01)$/i.test(code)
  ) {
    return false;
  }

  // Postgres undefined_column
  if (code === "42703") {
    return /archived_at|redirect_to_product_id/i.test(message);
  }

  // PostgREST: "column products.archived_at does not exist"
  // or "Could not find the 'archived_at' column of 'products' in the schema cache"
  const mentionsArchiveColumn =
    /column\s+([`"]?[\w.]+[`"]?\.)?[`"]?archived_at[`"]?/i.test(message) ||
    /column\s+([`"]?[\w.]+[`"]?\.)?[`"]?redirect_to_product_id[`"]?/i.test(
      message,
    ) ||
    /Could not find the [`']archived_at[`']/i.test(message) ||
    /Could not find the [`']redirect_to_product_id[`']/i.test(message);

  if (!mentionsArchiveColumn) return false;

  return /does not exist|Could not find/i.test(message);
}
