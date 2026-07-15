import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { useTransaction, type PaymentMethod } from '../context/TransactionContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

interface FirestoreTimestamp {
  _seconds: number
  _nanoseconds: number
}

interface HistoryTransaction {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: string
  createdAt: FirestoreTimestamp
}

const STATUS_COLOR: Record<string, string> = {
  success: 'text-emerald-700 dark:text-emerald-400',
  failed: 'text-rose-700 dark:text-rose-400',
  pending: 'text-amber-700 dark:text-amber-400',
  duplicate_ignored: 'text-amber-700 dark:text-amber-400',
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function shortenKey(key: string) {
  return key.length > 11 ? `${key.slice(0, 8)}...` : key
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
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto h-6 w-14" />
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleView(tx: HistoryTransaction) {
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
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">History</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every simulation you've run, across all sessions.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          {isLoading ? (
            <HistoryTableSkeleton />
          ) : error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          ) : transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="pb-2 font-medium">Idempotency Key</th>
                    <th className="pb-2 font-medium">Amount (₹)</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Created At</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-200">
                  {transactions.map((tx) => (
                    <tr key={tx.idempotencyKey} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-2 font-mono">{shortenKey(tx.idempotencyKey)}</td>
                      <td className="py-2">₹{tx.amount}</td>
                      <td className="py-2">{tx.paymentMethod}</td>
                      <td className={`py-2 ${STATUS_COLOR[tx.status] ?? 'text-slate-700 dark:text-slate-200'}`}>
                        {formatStatus(tx.status)}
                      </td>
                      <td className="py-2 whitespace-nowrap font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatTimestamp(tx.createdAt)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleView(tx)}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              message="No simulations yet — start one from the Payment Flow Simulator."
              actionLabel="Start New Simulation →"
              actionTo="/payment-flow"
            />
          )}
        </section>
      </main>
    </PageLayout>
  )
}
