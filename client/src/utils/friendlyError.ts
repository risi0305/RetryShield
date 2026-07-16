/**
 * `fetch()` itself throws a bare `TypeError` for network-level failures
 * (connection refused, DNS failure, CORS) — that's the one case where
 * `err.message` ("Failed to fetch") is too raw to show a user. Anything else
 * (including our own `throw new Error(body.error ?? ...)` for a non-ok
 * response) is already a human-readable message worth showing as-is.
 */
export function getFriendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof TypeError) {
    return "Can't reach the server — check your connection and try again."
  }
  return err instanceof Error ? err.message : fallback
}
