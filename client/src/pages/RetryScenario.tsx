import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { StatusBadge } from '../components/StatusBadge'
import { useTransaction } from '../context/TransactionContext'
import { useToast } from '../context/ToastContext'
import { getFriendlyErrorMessage } from '../utils/friendlyError'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const POLL_INTERVAL_MS = 2000
const AUTO_ADVANCE_DELAY_MS = 1500
const MAX_ATTEMPTS = 3

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

const RESOLVED_STYLES: Record<string, { ring: string; badge: string }> = {
  success: {
    ring: 'border-status-success/30 bg-status-success/10 text-status-success',
    badge: 'text-status-success',
  },
  duplicate_ignored: {
    ring: 'border-status-duplicate/30 bg-status-duplicate/10 text-status-duplicate',
    badge: 'text-status-duplicate',
  },
  failed: {
    ring: 'border-status-failed/30 bg-status-failed/10 text-status-failed',
    badge: 'text-status-failed',
  },
}

const ATTEMPT_STATUS_COLOR: Record<string, string> = {
  success: 'text-status-success',
  duplicate_ignored: 'text-status-duplicate',
  failed: 'text-status-failed',
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface RetryAttempt {
  attemptNumber: number
  status: string
}

export function RetryScenario() {
  const { transaction, setTransaction, clearTransaction } = useTransaction()
  const navigate = useNavigate()
  const showToast = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveStatus, setLiveStatus] = useState<string | null>(transaction?.status ?? null)
  const [attempts, setAttempts] = useState<RetryAttempt[]>([])

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  async function pollStatus(key: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${key}`)
      const body = await res.json()
      if (res.ok && typeof body.transaction?.status === 'string') {
        setLiveStatus(body.transaction.status)
        return body.transaction.status as string
      }
    } catch {
      // a missed tick isn't fatal — the next poll picks it back up
    }
    return null
  }

  // Poll while genuinely waiting on the *first* resolution — this is the
  // app's stand-in for "waiting on a webhook" (we never touch Firestore from
  // the browser directly, we just ask the backend what it currently knows).
  // Once resolved, further status changes only ever come from an explicit
  // retry click, so there's nothing left to passively watch for.
  useEffect(() => {
    if (!transaction) return

    stopPolling()
    setLiveStatus(transaction.status)
    setAttempts([])
    setIsAutoAdvancing(false)

    if (transaction.status !== 'pending') return

    pollStatus(transaction.idempotencyKey)
    pollingRef.current = setInterval(async () => {
      const status = await pollStatus(transaction.idempotencyKey)
      if (status && status !== 'pending') stopPolling()
    }, POLL_INTERVAL_MS)

    return stopPolling
  }, [transaction?.idempotencyKey])

  // Once every attempt has been used there's nothing more to demonstrate —
  // idempotency protection has held for all of them — so move on
  // automatically instead of leaving the user stranded on this page.
  useEffect(() => {
    if (attempts.length < MAX_ATTEMPTS || !transaction) return

    setIsAutoAdvancing(true)
    const timeout = setTimeout(() => navigate('/ledger-comparison'), AUTO_ADVANCE_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [attempts.length])

  function handleCancelSimulation() {
    stopPolling()
    clearTransaction()
    navigate('/')
  }

  async function handleRetryPayment() {
    if (!transaction || attempts.length >= MAX_ATTEMPTS) return

    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE_URL}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: transaction.idempotencyKey }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Retry failed')

      const resolvedStatus: string = body.transaction?.status ?? transaction.status
      stopPolling()
      setLiveStatus(resolvedStatus)
      setTransaction({ ...transaction, status: resolvedStatus })
      setAttempts((prev) => [...prev, { attemptNumber: prev.length + 1, status: resolvedStatus }])

      if (resolvedStatus === 'duplicate_ignored') {
        showToast(`Duplicate charge blocked — ₹${transaction.amount} saved`, 'success')
      } else if (resolvedStatus === 'success') {
        showToast('Payment retried successfully', 'success')
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Retry failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // "Response Lost" payments already succeeded on the backend the moment
  // they were created — the ambiguity is purely a display choice on this
  // page, masking that truth until the customer actually retries.
  const isMaskedResponseLost =
    transaction?.simulatedScenario === 'response_lost' && attempts.length === 0 && liveStatus === 'success'
  const isResolved = !isMaskedResponseLost && liveStatus !== null && liveStatus !== 'pending'
  const resolvedStyle = liveStatus ? RESOLVED_STYLES[liveStatus] : undefined
  const attemptsUsed = attempts.length
  const attemptsExhausted = attemptsUsed >= MAX_ATTEMPTS

  return (
    <PageLayout headerRight={<StatusBadge label="Simulation in Progress" color="blue" />}>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Retry Scenario</h1>
        <p className="mt-1 text-sm text-muted">
          The bank never confirmed the payment — decide how to resolve it.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 text-center shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
            <p className="text-muted">Start a payment first to run a retry scenario.</p>
            <button
              type="button"
              onClick={() => navigate('/payment-flow')}
              className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isResolved
                      ? (resolvedStyle?.ring ?? 'border-slate-300 bg-slate-100 text-slate-500')
                      : 'animate-pulse border-status-warning/30 bg-status-warning/10 text-status-warning'
                  }`}
                >
                  {isResolved ? (liveStatus === 'failed' ? <XIcon /> : <CheckIcon />) : <WarningIcon />}
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    Payment Status
                  </h2>
                  <p className="mt-2 text-slate-700 dark:text-slate-200">Request Sent to Bank</p>
                  <p className="text-slate-700 dark:text-slate-200">
                    {isResolved ? 'Response Received' : 'Response Not Received'}
                  </p>
                  <p
                    className={`mt-2 font-semibold ${
                      isResolved
                        ? (resolvedStyle?.badge ?? 'text-muted')
                        : 'text-status-warning'
                    }`}
                  >
                    Status: {isResolved ? formatStatus(liveStatus!).toUpperCase() : 'UNKNOWN'}
                  </p>
                  {!isResolved && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-warning" />
                      Checking with the bank every 2 seconds…
                    </p>
                  )}

                  {attemptsUsed > 0 && (
                    <>
                      <p className="mt-3 text-xs font-medium text-muted">
                        Retry Attempt {attemptsUsed} of {MAX_ATTEMPTS}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs">
                        {attempts.map((attempt) => (
                          <li key={attempt.attemptNumber} className="flex items-center gap-1.5">
                            <span className="text-slate-400 dark:text-slate-500">Attempt {attempt.attemptNumber}:</span>
                            <span
                              className={`font-medium ${
                                ATTEMPT_STATUS_COLOR[attempt.status] ?? 'text-muted'
                              }`}
                            >
                              {formatStatus(attempt.status)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {attemptsExhausted && (
                    <p className="mt-3 text-xs text-muted">
                      Maximum retry attempts reached — idempotency protection held across all {MAX_ATTEMPTS} tries.
                    </p>
                  )}
                  {isAutoAdvancing && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Continuing automatically…</p>
                  )}
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={isSubmitting || attemptsExhausted || isAutoAdvancing}
              className="mt-6 w-full rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Retrying…' : attemptsExhausted ? 'Max Retries Reached' : 'Retry Payment'}
            </button>

            {isResolved && (
              <button
                type="button"
                onClick={() => navigate('/ledger-comparison')}
                disabled={isAutoAdvancing}
                className="mt-3 w-full rounded-lg border border-brand-primary px-4 py-2.5 font-medium text-brand-primary transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-brand-primary/20"
              >
                Continue to Ledger Comparison
              </button>
            )}

            <button
              type="button"
              onClick={handleCancelSimulation}
              disabled={isAutoAdvancing}
              className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-muted transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel Simulation
            </button>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-status-failed/30 bg-status-failed/10 px-4 py-3 text-sm text-status-failed">
            {error}
          </p>
        )}
      </main>
    </PageLayout>
  )
}
