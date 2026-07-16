/**
 * The idempotency key is an internal identifier — in a real payment system
 * only the PSP/bank layer would ever see it. Everywhere the UI needs to show
 * the customer/ops-facing side of a transaction, it displays this derived
 * reference number instead, never the raw key. It's a pure deterministic
 * function of the key, so the same transaction always gets the same
 * reference wherever it's shown.
 */
export function toReferenceNumber(idempotencyKey: string): string {
  let hash = 2166136261 // FNV-1a offset basis
  for (let i = 0; i < idempotencyKey.length; i++) {
    hash ^= idempotencyKey.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const digits = (hash >>> 0).toString().padStart(8, '0').slice(-8)
  return `RS-${digits.slice(0, 4)}-${digits.slice(4)}`
}
