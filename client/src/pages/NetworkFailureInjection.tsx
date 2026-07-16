import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { StatusBadge } from '../components/StatusBadge'
import { Toggle } from '../components/Toggle'
import { useTransaction, type FailurePoint, type FailureType } from '../context/TransactionContext'
import { useToast } from '../context/ToastContext'
import { getFriendlyErrorMessage } from '../utils/friendlyError'
import { toReferenceNumber } from '../utils/reference'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const FAILURE_TYPES: FailureType[] = [
  'Network Lost After Request Sent',
  'Timeout Before Response',
  'Partial Response Received',
]

const FAILURE_POINTS: FailurePoint[] = [
  'Between Customer and Merchant',
  'Between PSP and Bank',
  'Between Bank and PSP (response)',
]

interface FailurePreset {
  label: string
  failureType: FailureType
  failurePoint: FailurePoint
  delaySeconds: number
}

const FAILURE_PRESETS: FailurePreset[] = [
  {
    label: 'UPI Timeout',
    failureType: 'Timeout Before Response',
    failurePoint: 'Between PSP and Bank',
    delaySeconds: 8,
  },
  {
    label: 'POS Network Drop',
    failureType: 'Network Lost After Request Sent',
    failurePoint: 'Between Customer and Merchant',
    delaySeconds: 4,
  },
  {
    label: 'Bank Server Overload',
    failureType: 'Partial Response Received',
    failurePoint: 'Between Bank and PSP (response)',
    delaySeconds: 10,
  },
  {
    label: 'Card Network Congestion',
    failureType: 'Timeout Before Response',
    failurePoint: 'Between Bank and PSP (response)',
    delaySeconds: 7,
  },
]

export function NetworkFailureInjection() {
  const { transaction, setTransaction, clearTransaction } = useTransaction()
  const navigate = useNavigate()
  const showToast = useToast()

  const [simulateFailure, setSimulateFailure] = useState(true)
  const [failureType, setFailureType] = useState<FailureType>(FAILURE_TYPES[0])
  const [failurePoint, setFailurePoint] = useState<FailurePoint>(FAILURE_POINTS[0])
  const [delaySeconds, setDelaySeconds] = useState('5')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyPreset(preset: FailurePreset) {
    setSimulateFailure(true)
    setFailureType(preset.failureType)
    setFailurePoint(preset.failurePoint)
    setDelaySeconds(String(preset.delaySeconds))
  }

  function handleStopSimulation() {
    clearTransaction()
    navigate('/')
  }

  async function handleApplyAndContinue() {
    if (!transaction) return

    const parsedDelay = Number(delaySeconds)
    if (simulateFailure && (!Number.isFinite(parsedDelay) || parsedDelay < 0)) {
      setError('Delay / Timeout must be a non-negative number')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE_URL}/inject-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: transaction.idempotencyKey,
          simulateFailure,
          failureType: simulateFailure ? failureType : null,
          failurePoint: simulateFailure ? failurePoint : null,
          delaySeconds: simulateFailure ? parsedDelay : 0,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Failed to apply failure injection')

      setTransaction({
        ...transaction,
        status: body.transaction?.status ?? transaction.status,
        failureType: body.transaction?.failureType ?? null,
        failurePoint: body.transaction?.failurePoint ?? null,
      })
      showToast(
        simulateFailure ? 'Failure injected — awaiting customer retry' : 'Clean path applied — no failure simulated',
        simulateFailure ? 'warning' : 'info',
      )
      navigate('/retry')
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply failure injection'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout
      headerRight={
        <>
          <StatusBadge label="Active Simulation" color="green" />
          <button
            type="button"
            onClick={handleStopSimulation}
            className="rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-rose-600"
          >
            Stop Simulation
          </button>
        </>
      }
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Network Failure Injection</h1>
        <p className="mt-1 text-sm text-muted">
          Configure how and where this transaction's network path should fail.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 text-center shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
            <p className="text-muted">Start a payment first to configure a failure injection.</p>
            <button
              type="button"
              onClick={() => navigate('/payment-flow')}
              className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-muted dark:border-slate-800 dark:bg-slate-800/40">
              Transaction{' '}
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {toReferenceNumber(transaction.idempotencyKey)}
              </span>
            </div>

            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Quick Presets
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FAILURE_PRESETS.map((preset) => {
                const isActive =
                  simulateFailure &&
                  failureType === preset.failureType &&
                  failurePoint === preset.failurePoint &&
                  delaySeconds === String(preset.delaySeconds)

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                      isActive
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-brand-primary hover:bg-brand-primary/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-brand-primary/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-semibold">{preset.label}</span>
                    <span className="mt-1 block text-muted">
                      {preset.failureType} · {preset.failurePoint} · {preset.delaySeconds}s
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex flex-col gap-6">
              <Toggle label="Simulate Network Failure" checked={simulateFailure} onChange={setSimulateFailure} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm text-muted">
                  Failure Type
                  <select
                    value={failureType}
                    onChange={(e) => setFailureType(e.target.value as FailureType)}
                    disabled={!simulateFailure}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {FAILURE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-sm text-muted">
                  Failure Point
                  <select
                    value={failurePoint}
                    onChange={(e) => setFailurePoint(e.target.value as FailurePoint)}
                    disabled={!simulateFailure}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {FAILURE_POINTS.map((point) => (
                      <option key={point} value={point}>
                        {point}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex max-w-xs flex-col gap-1.5 text-sm text-muted">
                Delay / Timeout (sec)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(e.target.value)}
                  disabled={!simulateFailure}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleApplyAndContinue}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Applying…' : 'Apply & Continue'}
            </button>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-status-failed/40 bg-status-failed/10 px-4 py-3 text-sm text-status-failed">
            {error}
          </p>
        )}
      </main>
    </PageLayout>
  )
}
