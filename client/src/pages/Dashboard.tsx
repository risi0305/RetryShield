import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '../components/EmptyState'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { useTheme } from '../context/ThemeContext'
import { useTransaction, type PaymentMethod } from '../context/TransactionContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

interface FirestoreTimestamp {
  _seconds: number
  _nanoseconds: number
}

interface RecentSimulation {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: string
  createdAt: FirestoreTimestamp
}

interface DashboardStats {
  totalSimulations: number
  totalAmountProcessed: number
  totalDuplicatesPrevented: number
  totalAmountProtected: number
  dailyCounts: { date: string; count: number }[]
  recentSimulations: RecentSimulation[]
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

function formatChartDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(ts: FirestoreTimestamp) {
  return new Date(ts._seconds * 1000).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ?? 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
        <Skeleton className="h-3 w-36" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export function Dashboard() {
  const { setTransaction } = useTransaction()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/dashboard`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load dashboard stats')
        return body as DashboardStats
      })
      .then((data) => {
        if (!cancelled) setStats(data)
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

  function handleRowClick(sim: RecentSimulation) {
    setTransaction({
      idempotencyKey: sim.idempotencyKey,
      amount: sim.amount,
      paymentMethod: sim.paymentMethod,
      status: sim.status,
    })
    navigate('/incident-timeline')
  }

  const isDark = theme === 'dark'
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0'
  const axisStroke = isDark ? '#64748b' : '#64748b'
  const tooltipBg = isDark ? '#0f172a' : '#ffffff'
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0'
  const tooltipLabelColor = isDark ? '#cbd5e1' : '#334155'

  return (
    <PageLayout
      showSteps={false}
      headerRight={
        <button
          type="button"
          onClick={() => navigate('/payment-flow')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Start New Simulation
        </button>
      }
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          An overview of every payment incident simulated so far.
        </p>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <p className="mt-8 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        ) : stats ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Simulations Run" value={String(stats.totalSimulations)} />
              <StatCard label="Total Amount Processed" value={`₹${stats.totalAmountProcessed}`} />
              <StatCard
                label="Duplicate Charges Prevented"
                value={String(stats.totalDuplicatesPrevented)}
                accent="text-emerald-700 dark:text-emerald-400"
              />
              <StatCard
                label="Total Amount Protected"
                value={`₹${stats.totalAmountProtected}`}
                accent="text-emerald-700 dark:text-emerald-400"
              />
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Simulations — Last 7 Days
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      stroke={axisStroke}
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} stroke={axisStroke} fontSize={12} tickLine={false} width={28} />
                    <Tooltip
                      labelFormatter={(value) => formatChartDate(String(value))}
                      contentStyle={{
                        background: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: tooltipLabelColor }}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Simulations" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Recent Simulations
              </h2>

              {stats.recentSimulations.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    message="No simulations yet — start one from the Payment Flow Simulator."
                    actionLabel="Start New Simulation →"
                    actionTo="/payment-flow"
                  />
                </div>
              ) : (
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="pb-2 font-medium">Idempotency Key</th>
                      <th className="pb-2 font-medium">Amount (₹)</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-200">
                    {stats.recentSimulations.map((sim) => (
                      <tr
                        key={sim.idempotencyKey}
                        onClick={() => handleRowClick(sim)}
                        className="cursor-pointer border-t border-slate-200 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="max-w-[200px] truncate py-2 font-mono">{sim.idempotencyKey}</td>
                        <td className="py-2">₹{sim.amount}</td>
                        <td className={`py-2 ${STATUS_COLOR[sim.status] ?? 'text-slate-700 dark:text-slate-200'}`}>
                          {formatStatus(sim.status)}
                        </td>
                        <td className="py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {formatTimestamp(sim.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : null}
      </main>
    </PageLayout>
  )
}
