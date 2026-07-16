import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { useTransaction } from '../context/TransactionContext'
import { useToast } from '../context/ToastContext'
import { getFriendlyErrorMessage } from '../utils/friendlyError'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

function Spinner() {
  return (
    <svg className="h-4 w-4 flex-shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function AiReportSkeleton() {
  return (
    <>
      <div className="mt-4 space-y-2 rounded-xl border border-l-4 border-slate-200 border-l-violet-600 bg-slate-50 p-4 dark:border-slate-800 dark:border-l-violet-500 dark:bg-slate-800/40">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      <Skeleton className="mt-6 h-3 w-24" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </>
  )
}

export function AiRootCauseAnalysis() {
  const { transaction, aiReport, setAiReport } = useTransaction()
  const navigate = useNavigate()
  const showToast = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerateReport() {
    if (!transaction) return

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: transaction.idempotencyKey }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Failed to generate AI report')
      setAiReport({ summary: body.summary, keyFactors: body.keyFactors })
      showToast('AI report generated', 'ai')
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to generate the AI report. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageLayout
      headerRight={
        transaction && (
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && <Spinner />}
            {isLoading ? 'Generating…' : 'Generate AI Report'}
          </button>
        )
      }
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Root Cause Analysis</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Let AI read this transaction's incident timeline and summarize what happened.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <p className="text-slate-600 dark:text-slate-300">Start a payment first to generate a root cause report.</p>
            <button
              type="button"
              onClick={() => navigate('/payment-flow')}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              AI Root Cause Summary
            </h2>

            {error && (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                {error}
              </p>
            )}

            {isLoading ? (
              <AiReportSkeleton />
            ) : aiReport ? (
              <>
                <div className="mt-4 rounded-xl border border-l-4 border-slate-200 border-l-violet-600 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:border-l-violet-500 dark:bg-slate-800/40 dark:text-slate-200">
                  {aiReport.summary}
                </div>

                <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Key Factors
                </h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-200">
                  {aiReport.keyFactors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </>
            ) : !error ? (
              <p className="mt-4 text-sm text-slate-500">Click "Generate AI Report" to analyze this incident.</p>
            ) : null}
          </section>
        )}
      </main>
    </PageLayout>
  )
}
