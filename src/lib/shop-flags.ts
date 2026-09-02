/**
 * Soft-launch / construction feature flags.
 * Flip these when the shop goes live.
 *
 * Local testing: set in `.env.local`:
 *   NEXT_PUBLIC_ORDERS_ENABLED=true
 */

/** Landing modal: e-shop is still under construction. */
export const SHOW_CONSTRUCTION_NOTICE =
  process.env.NEXT_PUBLIC_SHOW_CONSTRUCTION_NOTICE !== "false";

/** Cart checkout + place order. false = button stays disabled. */
export const ORDERS_ENABLED =
  process.env.NEXT_PUBLIC_ORDERS_ENABLED === "true";
