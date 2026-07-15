import { useEffect, useState, type ReactNode } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import type { PaymentMethod } from '../context/TransactionContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const SLOT_COUNT = 3

interface FirestoreTimestamp {
  _seconds: number
  _nanoseconds: number
}

interface FetchedEvent {
  step: string
  detail: string
  timestamp?: FirestoreTimestamp
}

interface ComparisonTransaction {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: string
  failureType: string | null
  failurePoint: string | null
  createdAt: FirestoreTimestamp
  events: FetchedEvent[]
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

function wasDuplicatePrevented(tx: ComparisonTransaction) {
  return tx.events.some((event) => event.step === 'duplicate_detected')
}

function resolutionDuration(tx: ComparisonTransaction) {
  if (tx.status === 'pending' || tx.events.length === 0) return 'Not resolved yet'

  const lastEvent = tx.events[tx.events.length - 1]
  if (!lastEvent.timestamp) return '—'

  const start = tx.createdAt._seconds + tx.createdAt._nanoseconds / 1e9
  const end = lastEvent.timestamp._seconds + lastEvent.timestamp._nanoseconds / 1e9
  const diffSeconds = end - start

  if (diffSeconds < 60) return `${diffSeconds.toFixed(1)}s`
  const minutes = Math.floor(diffSeconds / 60)
  const seconds = Math.round(diffSeconds % 60)
  return `${minutes}m ${seconds}s`
}

function PickerSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: SLOT_COUNT }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

export function ScenarioComparison() {
  const [transactions, setTransactions] = useState<ComparisonTransaction[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<(string | null)[]>(Array(SLOT_COUNT).fill(null))

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/transactions`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load simulations')
        return body.transactions as ComparisonTransaction[]
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

  function handleSlotChange(slotIndex: number, key: string) {
    setSelectedKeys((prev) => {
      const next = [...prev]
      next[slotIndex] = key || null
      return next
    })
  }

  const byKey = new Map((transactions ?? []).map((tx) => [tx.idempotencyKey, tx]))
  const selected = selectedKeys.map((key) => (key ? byKey.get(key) : undefined)).filter(Boolean) as ComparisonTransaction[]

  const rows: { label: string; render: (tx: ComparisonTransaction) => ReactNode }[] = [
    { label: 'Idempotency Key', render: (tx) => <span className="font-mono">{shortenKey(tx.idempotencyKey)}</span> },
    { label: 'Amount', render: (tx) => `₹${tx.amount}` },
    { label: 'Status', render: (tx) => formatStatus(tx.status) },
    { label: 'Failure Type', render: (tx) => tx.failureType ?? '—' },
    { label: 'Failure Point', render: (tx) => tx.failurePoint ?? '—' },
    {
      label: 'Duplicate Prevented',
      render: (tx) =>
        wasDuplicatePrevented(tx) ? (
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Yes</span>
        ) : (
          <span className="text-slate-500">No</span>
        ),
    },
    { label: 'Time to Resolution', render: (tx) => resolutionDuration(tx) },
  ]

  return (
    <PageLayout showSteps={false}>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Scenario Comparison</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pick 2–3 past simulations to compare their failure patterns and recovery time side by side.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          {isLoading ? (
            <PickerSkeleton />
          ) : error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          ) : !transactions || transactions.length < 2 ? (
            <EmptyState
              message="Not enough simulations yet — run at least two from the Payment Flow Simulator to compare them."
              actionLabel="Start New Simulation →"
              actionTo="/payment-flow"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: SLOT_COUNT }).map((_, slotIndex) => {
                const otherSelected = selectedKeys.filter((_, i) => i !== slotIndex)
                return (
                  <label key={slotIndex} className="flex flex-col gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {`Simulation ${slotIndex + 1}${slotIndex === SLOT_COUNT - 1 ? ' (optional)' : ''}`}
                    <select
                      value={selectedKeys[slotIndex] ?? ''}
                      onChange={(e) => handleSlotChange(slotIndex, e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">— Select —</option>
                      {transactions.map((tx) => (
                        <option
                          key={tx.idempotencyKey}
                          value={tx.idempotencyKey}
                          disabled={otherSelected.includes(tx.idempotencyKey)}
                        >
                          {shortenKey(tx.idempotencyKey)} — ₹{tx.amount} — {formatStatus(tx.status)}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>
          )}
        </section>

        {selected.length >= 2 && (
          <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Side-by-Side Comparison
            </h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-2 pr-6 font-medium">Attribute</th>
                  {selected.map((tx) => (
                    <th key={tx.idempotencyKey} className="pb-2 pr-6 font-mono font-medium">
                      {shortenKey(tx.idempotencyKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-6 font-medium text-slate-500 dark:text-slate-400">{row.label}</td>
                    {selected.map((tx) => (
                      <td key={tx.idempotencyKey} className="py-2 pr-6">
                        {row.render(tx)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {selected.length === 1 && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Pick at least one more simulation to see the comparison.
          </p>
        )}
      </main>
    </PageLayout>
  )
}
