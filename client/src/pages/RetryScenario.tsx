import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { StatusBadge } from '../components/StatusBadge'
import { useTransaction } from '../context/TransactionContext'
import { useToast } from '../context/ToastContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
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

const RESOLVED_STYLES: Record<string, { ring: string; badge: string }> = {
  success: {
    ring: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
    badge: 'text-emerald-700 dark:text-emerald-400',
  },
  duplicate_ignored: {
    ring: 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400',
    badge: 'text-amber-700 dark:text-amber-400',
  },
  failed: {
    ring: 'border-rose-600/30 bg-rose-600/10 text-rose-700 dark:text-rose-400',
    badge: 'text-rose-700 dark:text-rose-400',
  },
}

const ATTEMPT_STATUS_COLOR: Record<string, string> = {
  success: 'text-emerald-700 dark:text-emerald-400',
  duplicate_ignored: 'text-amber-700 dark:text-amber-400',
  failed: 'text-rose-700 dark:text-rose-400',
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
      const res = await fetch(`${API_BASE_URL}/api/transactions/${key}`)
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
      const res = await fetch(`${API_BASE_URL}/api/retry`, {
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
        showToast('Duplicate charge prevented!', 'success')
      } else if (resolvedStatus === 'success') {
        showToast('Payment retried successfully', 'success')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isResolved = liveStatus !== null && liveStatus !== 'pending'
  const resolvedStyle = liveStatus ? RESOLVED_STYLES[liveStatus] : undefined
  const attemptsUsed = attempts.length
  const attemptsExhausted = attemptsUsed >= MAX_ATTEMPTS

  return (
    <PageLayout headerRight={<StatusBadge label="Simulation in Progress" color="blue" />}>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Retry Scenario</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The bank never confirmed the payment — decide how to resolve it.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <p className="text-slate-600 dark:text-slate-300">Start a payment first to run a retry scenario.</p>
            <button
              type="button"
              onClick={() => navigate('/payment-flow')}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isResolved
                      ? (resolvedStyle?.ring ?? 'border-slate-300 bg-slate-100 text-slate-500')
                      : 'animate-pulse border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {isResolved ? <CheckIcon /> : <WarningIcon />}
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Payment Status
                  </h2>
                  <p className="mt-2 text-slate-700 dark:text-slate-200">Request Sent to Bank</p>
                  <p className="text-slate-700 dark:text-slate-200">
                    {isResolved ? 'Response Received' : 'Response Not Received'}
                  </p>
                  <p
                    className={`mt-2 font-semibold ${
                      isResolved
                        ? (resolvedStyle?.badge ?? 'text-slate-600 dark:text-slate-300')
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    Status: {isResolved ? formatStatus(liveStatus!).toUpperCase() : 'UNKNOWN'}
                  </p>
                  {!isResolved && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />
                      Checking with the bank every 2 seconds…
                    </p>
                  )}

                  {attemptsUsed > 0 && (
                    <>
                      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Retry Attempt {attemptsUsed} of {MAX_ATTEMPTS}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs">
                        {attempts.map((attempt) => (
                          <li key={attempt.attemptNumber} className="flex items-center gap-1.5">
                            <span className="text-slate-400 dark:text-slate-500">Attempt {attempt.attemptNumber}:</span>
                            <span
                              className={`font-medium ${
                                ATTEMPT_STATUS_COLOR[attempt.status] ?? 'text-slate-600 dark:text-slate-300'
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
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
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
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Retrying…' : attemptsExhausted ? 'Max Retries Reached' : 'Retry Payment'}
            </button>

            {isResolved && (
              <button
                type="button"
                onClick={() => navigate('/ledger-comparison')}
                disabled={isAutoAdvancing}
                className="mt-3 w-full rounded-lg border border-blue-600 px-4 py-2.5 font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                Continue to Ledger Comparison
              </button>
            )}

            <button
              type="button"
              onClick={handleCancelSimulation}
              disabled={isAutoAdvancing}
              className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel Simulation
            </button>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        )}
      </main>
    </PageLayout>
  )
}
