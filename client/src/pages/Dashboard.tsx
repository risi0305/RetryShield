import { Activity, CheckCircle2, ShieldAlert, ShieldCheck, TrendingUp, Wallet, XCircle, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { useTheme } from '../context/ThemeContext'
import { useTransaction, type PaymentMethod } from '../context/TransactionContext'
import { getFriendlyErrorMessage } from '../utils/friendlyError'
import { toReferenceNumber } from '../utils/reference'

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

interface ActivityItem {
  message: string
  tone: 'success' | 'failed' | 'duplicate'
  timestamp: FirestoreTimestamp
  idempotencyKey: string
}

interface RawTransaction {
  amount: number
  status: string
  createdAt: FirestoreTimestamp
}

interface ProtectedPoint {
  index: number
  cumulative: number
}

interface DashboardStats {
  totalSimulations: number
  totalAmountProcessed: number
  totalDuplicatesPrevented: number
  totalAmountProtected: number
  successRate: number
  dailyCounts: { date: string; count: number }[]
  recentSimulations: RecentSimulation[]
  recentActivity: ActivityItem[]
}

const STATUS_PILL: Record<string, string> = {
  success: 'bg-status-success/10 text-status-success',
  pending: 'bg-status-warning/10 text-status-warning',
  failed: 'bg-status-failed/10 text-status-failed',
  duplicate_ignored: 'bg-status-duplicate/10 text-status-duplicate',
}

const ACTIVITY_ICON: Record<ActivityItem['tone'], { Icon: LucideIcon; classes: string }> = {
  success: { Icon: CheckCircle2, classes: 'bg-status-success/10 text-status-success' },
  failed: { Icon: XCircle, classes: 'bg-status-failed/10 text-status-failed' },
  duplicate: { Icon: ShieldAlert, classes: 'bg-status-duplicate/10 text-status-duplicate' },
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

function timeAgo(ts: FirestoreTimestamp) {
  const diffSec = Math.max(0, Math.round((Date.now() - ts._seconds * 1000) / 1000))
  if (diffSec < 60) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
}

/** Animates 0 -> target with an ease-out curve, re-triggered whenever the target changes. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let rafId: number
    const start = performance.now()

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, durationMs])

  return value
}

function StatCard({
  label,
  icon: Icon,
  value,
  formatter = (n: number) => Math.round(n).toLocaleString('en-IN'),
  iconClasses = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}: {
  label: string
  icon: LucideIcon
  value: number
  formatter?: (n: number) => string
  iconClasses?: string
}) {
  const animated = useCountUp(value)
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClasses}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <p className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {formatter(animated)}
      </p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20 lg:col-span-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-64 w-full" />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20 lg:col-span-2">
          <Skeleton className="h-3 w-32" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="mt-4 h-40 w-full" />
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
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
  const [retryToken, setRetryToken] = useState(0)

  const [protectedSeries, setProtectedSeries] = useState<ProtectedPoint[]>([])
  const [isProtectedLoading, setIsProtectedLoading] = useState(true)
  const [protectedError, setProtectedError] = useState<string | null>(null)
  const [protectedRetryToken, setProtectedRetryToken] = useState(0)

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
        if (!cancelled) setError(getFriendlyErrorMessage(err, 'Failed to load dashboard stats'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [retryToken])

  // Same `/api/transactions` list the History/Ledger Comparison pages use —
  // just aggregated differently here into a running total of every
  // duplicate charge idempotency protection has blocked, in chronological order.
  useEffect(() => {
    let cancelled = false
    setIsProtectedLoading(true)
    setProtectedError(null)

    fetch(`${API_BASE_URL}/api/transactions`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load simulations')
        return body.transactions as RawTransaction[]
      })
      .then((data) => {
        if (cancelled) return
        const chronological = [...data].sort((a, b) => a.createdAt._seconds - b.createdAt._seconds)
        let running = 0
        const points: ProtectedPoint[] = chronological.map((txn, i) => {
          if (txn.status === 'duplicate_ignored') running += txn.amount
          return { index: i + 1, cumulative: running }
        })
        setProtectedSeries(points)
      })
      .catch((err) => {
        if (!cancelled) setProtectedError(getFriendlyErrorMessage(err, 'Failed to load simulations'))
      })
      .finally(() => {
        if (!cancelled) setIsProtectedLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [protectedRetryToken])

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
  const axisStroke = isDark ? '#64748b' : '#94a3b8'
  const tooltipBg = isDark ? '#0f172a' : '#ffffff'
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0'
  const tooltipLabelColor = isDark ? '#cbd5e1' : '#334155'

  return (
    <PageLayout
      showSteps={false}
      headerTagline="Payment Incident Replay & Retry Protection"
      headerRight={
        <button
          type="button"
          onClick={() => navigate('/payment-flow')}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover"
        >
          Start New Simulation
        </button>
      }
    >
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          An overview of every payment incident simulated so far.
        </p>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="mt-8">
            <ErrorState message={error} onRetry={() => setRetryToken((n) => n + 1)} />
          </div>
        ) : stats ? (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Simulations" icon={Activity} value={stats.totalSimulations} />
              <StatCard
                label="Duplicate Charges Prevented"
                icon={ShieldCheck}
                value={stats.totalDuplicatesPrevented}
              />
              <StatCard
                label="Amount Protected (₹)"
                icon={Wallet}
                value={stats.totalAmountProtected}
                formatter={(n) => `₹${Math.round(n).toLocaleString('en-IN')}`}
              />
              <StatCard
                label="Success Rate (%)"
                icon={TrendingUp}
                value={stats.successRate}
                formatter={(n) => `${n.toFixed(1)}%`}
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-5">
              <section className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20 lg:col-span-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Simulations — Last 7 Days
                </h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.dailyCounts}>
                      <defs>
                        <linearGradient id="simulationsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatChartDate}
                        stroke={axisStroke}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke={axisStroke}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
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
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        fill="url(#simulationsGradient)"
                        name="Simulations"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20 lg:col-span-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Recent Activity
                </h2>

                {stats.recentActivity.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    No activity yet — start a simulation to see events here.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {stats.recentActivity.map((item, i) => {
                      const { Icon, classes } = ACTIVITY_ICON[item.tone]
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${classes}`}>
                            <Icon size={16} strokeWidth={2} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-700 dark:text-slate-200">{item.message}</p>
                            <p className="text-xs text-muted">{timeAgo(item.timestamp)}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>

            <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Cumulative Amount Protected
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Running value of duplicate charges blocked, across every simulation run
              </p>

              <div className="mt-4">
                {isProtectedLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : protectedError ? (
                  <ErrorState message={protectedError} onRetry={() => setProtectedRetryToken((n) => n + 1)} />
                ) : protectedSeries.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <p className="text-sm text-muted">
                      No simulations yet — start one to see protected value build up here.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/payment-flow')}
                      className="text-sm font-medium text-brand-primary hover:underline"
                    >
                      Start New Simulation →
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={protectedSeries}>
                          <defs>
                            <linearGradient id="protectedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                          <XAxis dataKey="index" stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis
                            stroke={axisStroke}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={56}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <Tooltip
                            labelFormatter={(value) => `Simulation #${value}`}
                            formatter={(value) => [`₹${value}`, 'Cumulative Protected']}
                            contentStyle={{
                              background: tooltipBg,
                              border: `1px solid ${tooltipBorder}`,
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelStyle={{ color: tooltipLabelColor }}
                          />
                          <Area
                            type="stepAfter"
                            dataKey="cumulative"
                            stroke="#10B981"
                            strokeWidth={2}
                            fill="url(#protectedGradient)"
                            name="Cumulative Protected"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-sm font-medium text-status-success">
                      Total protected so far: ₹{Math.round(stats.totalAmountProtected).toLocaleString('en-IN')}
                    </p>
                  </>
                )}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
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
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-muted">
                        <th className="whitespace-nowrap pb-2 pr-6 font-medium">Reference</th>
                        <th className="whitespace-nowrap pb-2 pr-6 font-medium">Amount (₹)</th>
                        <th className="whitespace-nowrap pb-2 pr-6 font-medium">Status</th>
                        <th className="whitespace-nowrap pb-2 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-200">
                      {stats.recentSimulations.map((sim) => (
                        <tr
                          key={sim.idempotencyKey}
                          onClick={() => handleRowClick(sim)}
                          className="cursor-pointer border-t border-slate-200 transition-colors even:bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:even:bg-slate-800/20 dark:hover:bg-slate-800/50"
                        >
                          <td className="whitespace-nowrap py-2.5 pr-6 font-mono">{toReferenceNumber(sim.idempotencyKey)}</td>
                          <td className="whitespace-nowrap py-2.5 pr-6">₹{sim.amount}</td>
                          <td className="whitespace-nowrap py-2.5 pr-6">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                STATUS_PILL[sim.status] ?? 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {formatStatus(sim.status)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-2.5 font-mono text-xs text-muted">
                            {formatTimestamp(sim.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </PageLayout>
  )
}
