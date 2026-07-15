import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { useTheme } from '../context/ThemeContext'
import { useTransaction } from '../context/TransactionContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

interface FetchedTransaction {
  idempotencyKey: string
  amount: number
  status: string
}

interface FirestoreTimestamp {
  _seconds: number
  _nanoseconds: number
}

interface SessionTransaction {
  amount: number
  status: string
  createdAt: FirestoreTimestamp
}

interface CumulativePoint {
  index: number
  cumulative: number
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
      className="h-5 w-5 flex-shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-5 w-5 flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function LedgerCardSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg shadow-black/5 dark:border-slate-800 dark:shadow-black/20">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="bg-white p-6 dark:bg-slate-900">
        <div className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </section>
  )
}

export function LedgerComparison() {
  const { transaction } = useTransaction()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const [fetched, setFetched] = useState<FetchedTransaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cumulativePoints, setCumulativePoints] = useState<CumulativePoint[]>([])
  const [totalSaved, setTotalSaved] = useState(0)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    if (!transaction) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/transactions/${transaction.idempotencyKey}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load transaction')
        return body.transaction as FetchedTransaction
      })
      .then((data) => {
        if (!cancelled) setFetched(data)
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
  }, [transaction])

  useEffect(() => {
    let cancelled = false
    setIsSessionLoading(true)
    setSessionError(null)

    fetch(`${API_BASE_URL}/api/transactions`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load simulations')
        return body.transactions as SessionTransaction[]
      })
      .then((data) => {
        if (cancelled) return
        const chronological = [...data].sort((a, b) => a.createdAt._seconds - b.createdAt._seconds)
        let running = 0
        const points: CumulativePoint[] = chronological.map((txn, i) => {
          if (txn.status === 'duplicate_ignored') running += txn.amount
          return { index: i + 1, cumulative: running }
        })
        setCumulativePoints(points)
        setTotalSaved(running)
      })
      .catch((err) => {
        if (!cancelled) setSessionError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (!cancelled) setIsSessionLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [transaction?.idempotencyKey])

  const isDark = theme === 'dark'
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0'
  const axisStroke = isDark ? '#64748b' : '#94a3b8'
  const tooltipBg = isDark ? '#0f172a' : '#ffffff'
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0'
  const tooltipLabelColor = isDark ? '#e2e8f0' : '#334155'

  return (
    <PageLayout>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Ledger Comparison</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          See what this transaction's ledger looks like with and without idempotency protection.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <p className="text-slate-600 dark:text-slate-300">Start a payment first to compare its ledger.</p>
            <button
              type="button"
              onClick={() => navigate('/payment-flow')}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : isLoading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <LedgerCardSkeleton />
            <LedgerCardSkeleton />
          </div>
        ) : error ? (
          <p className="mt-8 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        ) : fetched ? (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg shadow-black/5 dark:border-slate-800 dark:shadow-black/20">
                <div className="flex items-center justify-between border-b border-l-4 border-slate-200 border-l-rose-600 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:border-l-rose-500 dark:bg-slate-800/40">
                  <h2 className="font-semibold text-rose-700 dark:text-rose-300">Without Retry Protection</h2>
                  <span className="rounded-full border border-rose-600/40 bg-rose-600/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
                    Hypothetical
                  </span>
                </div>
                <div className="bg-white p-6 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="pb-2 font-medium">Txn ID</th>
                        <th className="pb-2 font-medium">Amount (₹)</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-200">
                      <tr className="border-t border-slate-200 dark:border-slate-800">
                        <td className="max-w-[140px] truncate py-2 font-mono">{fetched.idempotencyKey}</td>
                        <td className="py-2">₹{fetched.amount}</td>
                        <td className="py-2">Success</td>
                      </tr>
                      <tr className="border-t border-slate-200 dark:border-slate-800">
                        <td className="max-w-[140px] truncate py-2 font-mono">{fetched.idempotencyKey}</td>
                        <td className="py-2">₹{fetched.amount}</td>
                        <td className="py-2">Success</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs italic text-rose-700/80 dark:text-rose-300/80">
                    Simulated — this duplicate charge did not actually happen.
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Debit</span>
                    <span className="text-lg font-semibold text-rose-700 dark:text-rose-300">₹{fetched.amount * 2}</span>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg shadow-black/5 dark:border-slate-800 dark:shadow-black/20">
                <div className="border-b border-l-4 border-slate-200 border-l-emerald-600 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:border-l-emerald-500 dark:bg-slate-800/40">
                  <h2 className="font-semibold text-emerald-700 dark:text-emerald-300">
                    With Retry Protection (Idempotency)
                  </h2>
                </div>
                <div className="bg-white p-6 dark:bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="pb-2 font-medium">Txn ID</th>
                        <th className="pb-2 font-medium">Amount (₹)</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-200">
                      <tr className="border-t border-slate-200 dark:border-slate-800">
                        <td className="max-w-[140px] truncate py-2 font-mono">{fetched.idempotencyKey}</td>
                        <td className="py-2">₹{fetched.amount}</td>
                        <td className="py-2">{formatStatus(fetched.status)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckIcon />
                    Retry Detected – Duplicate Ignored
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Debit</span>
                    <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                      ₹{fetched.amount}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-l-4 border-slate-200 border-l-sky-600 bg-slate-50 px-4 py-3 text-sm text-sky-800 dark:border-slate-800 dark:border-l-sky-500 dark:bg-slate-800/40 dark:text-sky-200">
              <InfoIcon />
              <p>Retry Protection prevents duplicate charges using a unique transaction ID (Idempotency Key).</p>
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-lg shadow-black/5 dark:border-slate-800 dark:shadow-black/20">
              <div className="border-b border-l-4 border-slate-200 border-l-emerald-600 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:border-l-emerald-500 dark:bg-slate-800/40">
                <h2 className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Total Amount Saved by Idempotency Protection
                </h2>
                <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Cumulative across every simulation run this session
                </p>
              </div>
              <div className="bg-white p-6 dark:bg-slate-900">
                {isSessionLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : sessionError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                    {sessionError}
                  </p>
                ) : cumulativePoints.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No simulations yet — run more scenarios to build up this chart.
                  </p>
                ) : (
                  <>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cumulativePoints} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="index"
                            stroke={axisStroke}
                            tick={{ fill: axisStroke, fontSize: 11 }}
                            tickLine={false}
                            label={{ value: 'Simulation #', position: 'insideBottom', offset: -2, fill: axisStroke, fontSize: 11 }}
                          />
                          <YAxis
                            stroke={axisStroke}
                            tick={{ fill: axisStroke, fontSize: 11 }}
                            tickLine={false}
                            width={56}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <Tooltip
                            contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                            labelStyle={{ color: tooltipLabelColor }}
                            labelFormatter={(value) => `Simulation #${value}`}
                            formatter={(value) => [`₹${value}`, 'Cumulative Saved']}
                          />
                          <Line
                            type="stepAfter"
                            dataKey="cumulative"
                            stroke="#059669"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Total saved so far: ₹{totalSaved}
                    </p>
                  </>
                )}
              </div>
            </section>

            <Link
              to="/incident-timeline"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              View Incident Timeline
            </Link>
          </>
        ) : null}
      </main>
    </PageLayout>
  )
}
