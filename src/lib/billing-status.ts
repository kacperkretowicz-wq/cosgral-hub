import type { BillingStatus } from "./types";

/** Values that exist on the original Postgres enum from migration 008. */
const DB_NATIVE_BILLING: ReadonlySet<string> = new Set([
  "wycena",
  "faktura",
  "oplacone",
  "anulowane",
]);

/**
 * Map UI aliases (`w_toku`, `rozliczone`) to enum values that always exist
 * in Postgres, so creates/updates work before migration 011 is applied.
 */
export function billingStatusForWrite(
  status: BillingStatus | null | undefined,
): BillingStatus {
  if (!status) return "wycena";
  if (status === "w_toku") return "wycena";
  if (status === "rozliczone") return "oplacone";
  if (DB_NATIVE_BILLING.has(status)) return status;
  return "wycena";
}

export function isInvalidBillingEnumError(error: {
  code?: string;
  message?: string;
}): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("billing_status") &&
    (msg.includes("invalid input value for enum") ||
      msg.includes("invalid input value"))
  );
}
