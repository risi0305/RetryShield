import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { useTransaction, type PaymentMethod } from '../context/TransactionContext'
import { getFriendlyErrorMessage } from '../utils/friendlyError'
import { toReferenceNumber } from '../utils/reference'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

interface FirestoreTimestamp {
  _seconds: number
  _nanoseconds: number
}

interface HistoryEvent {
  step: string
}

interface HistoryTransaction {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: string
  events: HistoryEvent[]
  createdAt: FirestoreTimestamp
}

type Outcome = 'success' | 'genuine_retry' | 'duplicate_blocked' | 'failed' | 'pending'

const OUTCOME_CONFIG: Record<Outcome, { label: string; classes: string }> = {
  success: { label: 'Success', classes: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  genuine_retry: { label: 'Genuine Retry', classes: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  duplicate_blocked: { label: 'Duplicate Blocked', classes: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  failed: { label: 'Failed', classes: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
  pending: { label: 'Pending', classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
}

/** The raw `status` field can't tell "first-try success" apart from "succeeded after a genuine failure" — that only shows up in the event log. */
function deriveOutcome(tx: HistoryTransaction): Outcome {
  if (tx.status === 'failed') return 'failed'
  if (tx.status === 'duplicate_ignored') return 'duplicate_blocked'
  if (tx.status === 'pending') return 'pending'
  if (tx.status === 'success' && tx.events.some((e) => e.step === 'retry_after_failure')) return 'genuine_retry'
  return 'success'
}

function formatTimestamp(ts: FirestoreTimestamp) {
  return new Date(ts._seconds * 1000).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HistoryTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

export function History() {
  const { setTransaction } = useTransaction()
  const navigate = useNavigate()

  const [transactions, setTransactions] = useState<HistoryTransaction[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | Outcome>('all')
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/transactions`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load history')
        return body.transactions as HistoryTransaction[]
      })
      .then((data) => {
        if (!cancelled) setTransactions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getFriendlyErrorMessage(err, 'Failed to load history'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [retryToken])

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    const query = searchQuery.trim().toLowerCase()
    return transactions.filter((tx) => {
      const matchesQuery = query === '' || toReferenceNumber(tx.idempotencyKey).toLowerCase().includes(query)
      const matchesOutcome = outcomeFilter === 'all' || deriveOutcome(tx) === outcomeFilter
      return matchesQuery && matchesOutcome
    })
  }, [transactions, searchQuery, outcomeFilter])

  function handleRowClick(tx: HistoryTransaction) {
    setTransaction({
      idempotencyKey: tx.idempotencyKey,
      amount: tx.amount,
      paymentMethod: tx.paymentMethod,
      status: tx.status,
    })
    navigate('/incident-timeline')
  }

  return (
    <PageLayout showSteps={false}>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">History</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every simulation you've run, across all sessions.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                strokeWidth={2}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by reference number…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as 'all' | Outcome)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="all">All Outcomes</option>
              {(Object.entries(OUTCOME_CONFIG) as [Outcome, { label: string }][]).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <HistoryTableSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={() => setRetryToken((n) => n + 1)} />
            ) : transactions && transactions.length > 0 ? (
              filteredTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="whitespace-nowrap pb-2 pr-6 font-medium">Reference</th>
                        <th className="whitespace-nowrap pb-2 pr-6 font-medium">Amount (₹)</th>
                        <th className="whitespace-nowrap pb-2 pr-6 font-medium">Payment Method</th>
                        <th className="whitespace-nowrap pb-2 pr-6 font-medium">Outcome</th>
                        <th className="whitespace-nowrap pb-2 font-medium">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-200">
                      {filteredTransactions.map((tx) => {
                        const outcome = deriveOutcome(tx)
                        const cfg = OUTCOME_CONFIG[outcome]
                        return (
                          <tr
                            key={tx.idempotencyKey}
                            onClick={() => handleRowClick(tx)}
                            className="cursor-pointer border-t border-slate-200 transition-colors even:bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:even:bg-slate-800/20 dark:hover:bg-slate-800/50"
                          >
                            <td className="whitespace-nowrap py-2.5 pr-6 font-mono">{toReferenceNumber(tx.idempotencyKey)}</td>
                            <td className="whitespace-nowrap py-2.5 pr-6">₹{tx.amount}</td>
                            <td className="whitespace-nowrap py-2.5 pr-6">{tx.paymentMethod}</td>
                            <td className="whitespace-nowrap py-2.5 pr-6">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cfg.classes}`}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                              {formatTimestamp(tx.createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No simulations match your search or filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setOutcomeFilter('all')
                    }}
                    className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Clear filters
                  </button>
                </div>
              )
            ) : (
              <EmptyState
                message="No simulations yet — start one from the Payment Flow Simulator."
                actionLabel="Start New Simulation →"
                actionTo="/payment-flow"
              />
            )}
          </div>
        </section>
      </main>
    </PageLayout>
  )
}
