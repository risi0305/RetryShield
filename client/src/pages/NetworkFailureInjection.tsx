import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { StatusBadge } from '../components/StatusBadge'
import { Toggle } from '../components/Toggle'
import { useTransaction, type FailurePoint, type FailureType } from '../context/TransactionContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

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

export function NetworkFailureInjection() {
  const { transaction, setTransaction, clearTransaction } = useTransaction()
  const navigate = useNavigate()

  const [simulateFailure, setSimulateFailure] = useState(true)
  const [failureType, setFailureType] = useState<FailureType>(FAILURE_TYPES[0])
  const [failurePoint, setFailurePoint] = useState<FailurePoint>(FAILURE_POINTS[0])
  const [delaySeconds, setDelaySeconds] = useState('5')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch(`${API_BASE_URL}/api/inject-failure`, {
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
        failureType: body.transaction?.failureType ?? null,
        failurePoint: body.transaction?.failurePoint ?? null,
      })
      navigate('/retry')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        right={
          <>
            <StatusBadge label="Active Simulation" color="green" />
            <button
              type="button"
              onClick={handleStopSimulation}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-red-900/30 transition-colors hover:bg-red-500"
            >
              Stop Simulation
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-100">Network Failure Injection</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure how and where this transaction's network path should fail.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-lg shadow-black/20">
            <p className="text-slate-300">Start a payment first to configure a failure injection.</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-900/30 transition-colors hover:bg-blue-500"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20">
            <div className="mb-6 rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-3 text-sm text-slate-400">
              Transaction <span className="font-mono text-slate-300">{transaction.idempotencyKey}</span>
            </div>

            <div className="flex flex-col gap-6">
              <Toggle label="Simulate Network Failure" checked={simulateFailure} onChange={setSimulateFailure} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm text-slate-300">
                  Failure Type
                  <select
                    value={failureType}
                    onChange={(e) => setFailureType(e.target.value as FailureType)}
                    disabled={!simulateFailure}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none transition-colors focus:border-blue-500 disabled:opacity-50"
                  >
                    {FAILURE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-sm text-slate-300">
                  Failure Point
                  <select
                    value={failurePoint}
                    onChange={(e) => setFailurePoint(e.target.value as FailurePoint)}
                    disabled={!simulateFailure}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none transition-colors focus:border-blue-500 disabled:opacity-50"
                  >
                    {FAILURE_POINTS.map((point) => (
                      <option key={point} value={point}>
                        {point}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex max-w-xs flex-col gap-1.5 text-sm text-slate-300">
                Delay / Timeout (sec)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(e.target.value)}
                  disabled={!simulateFailure}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none transition-colors focus:border-blue-500 disabled:opacity-50"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleApplyAndContinue}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-md shadow-blue-900/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Applying…' : 'Apply & Continue'}
            </button>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </main>
    </div>
  )
}
