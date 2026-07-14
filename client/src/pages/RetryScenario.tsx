import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { StatusBadge } from '../components/StatusBadge'
import { useTransaction } from '../context/TransactionContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

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

export function RetryScenario() {
  const { transaction, setTransaction, clearTransaction } = useTransaction()
  const navigate = useNavigate()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCancelSimulation() {
    clearTransaction()
    navigate('/')
  }

  async function handleRetryPayment() {
    if (!transaction) return

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

      setTransaction({
        ...transaction,
        status: body.transaction?.status ?? transaction.status,
      })
      navigate('/incident-timeline')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header right={<StatusBadge label="Simulation in Progress" color="blue" />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-100">Retry Scenario</h1>
        <p className="mt-1 text-sm text-slate-400">
          The bank never confirmed the payment — decide how to resolve it.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-lg shadow-black/20">
            <p className="text-slate-300">Start a payment first to run a retry scenario.</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-900/30 transition-colors hover:bg-blue-500"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <WarningIcon />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Payment Status
                  </h2>
                  <p className="mt-2 text-slate-200">Request Sent to Bank</p>
                  <p className="text-slate-200">Response Not Received</p>
                  <p className="mt-2 font-semibold text-amber-400">Status: UNKNOWN</p>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-md shadow-blue-900/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Retrying…' : 'Retry Payment'}
            </button>

            <button
              type="button"
              onClick={handleCancelSimulation}
              className="mt-3 w-full rounded-lg border border-slate-700 px-4 py-2.5 font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              Cancel Simulation
            </button>
          </>
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
