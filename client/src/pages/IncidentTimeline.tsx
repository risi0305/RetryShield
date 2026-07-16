import { jsPDF } from 'jspdf'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { PageLayout } from '../components/PageLayout'
import { Skeleton } from '../components/Skeleton'
import { useTransaction } from '../context/TransactionContext'
import { useToast } from '../context/ToastContext'
import { getFriendlyErrorMessage } from '../utils/friendlyError'
import { toReferenceNumber } from '../utils/reference'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

interface FirestoreTimestamp {
  _seconds: number
  _nanoseconds: number
}

interface FetchedEvent {
  step: string
  detail: string
  timestamp?: FirestoreTimestamp
}

interface FetchedTransaction {
  idempotencyKey: string
  amount: number
  status: string
  events: FetchedEvent[]
}

const FINAL_STATUS_COLOR: Record<string, string> = {
  success: 'text-status-success',
  failed: 'text-status-failed',
  pending: 'text-status-warning',
  duplicate_ignored: 'text-status-duplicate',
}

function formatTimestamp(ts: FirestoreTimestamp | undefined) {
  if (!ts) return '—'
  const date = new Date(ts._seconds * 1000 + Math.floor(ts._nanoseconds / 1e6))
  const time = date.toLocaleTimeString('en-US', { hour12: false })
  return `${time}.${String(date.getMilliseconds()).padStart(3, '0')}`
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function TimelineSkeleton() {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
      <ol className="relative border-l-2 border-slate-200 pl-8 dark:border-slate-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="relative pb-8 last:pb-0">
            <span className="absolute -left-10 top-0.5 h-4 w-4 rounded-full border-2 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-64" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 flex-shrink-0"
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

/** jsPDF's built-in fonts don't cover the ₹ glyph, so amounts use "Rs." in the export. */
function buildReportPdf(fetched: FetchedTransaction, aiReport: { summary: string; keyFactors: string[] } | null) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 48
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2
  let y = 56

  function ensureSpace(lineHeight: number) {
    if (y + lineHeight > pageHeight - 48) {
      doc.addPage()
      y = 56
    }
  }

  function heading(text: string) {
    y += 10
    ensureSpace(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(text, marginX, y)
    y += 18
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
  }

  function paragraph(text: string, mono = false) {
    // jsPDF's built-in fonts don't cover the ₹ glyph (it renders as a stray
    // superscript mark), so every string routed through here — including
    // event text pulled verbatim from Firestore — gets it swapped for "Rs.".
    const safeText = text.replace(/₹/g, 'Rs. ')
    doc.setFont(mono ? 'courier' : 'helvetica', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(safeText, maxWidth) as string[]
    for (const line of lines) {
      ensureSpace(14)
      doc.text(line, marginX, y)
      y += 14
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('RetryShield — Incident Report', marginX, y)
  y += 24

  paragraph(`Reference: ${toReferenceNumber(fetched.idempotencyKey)}`, true)
  paragraph(`Generated: ${new Date().toLocaleString()}`)

  heading('Event Timeline')
  for (const event of fetched.events) {
    paragraph(`${formatTimestamp(event.timestamp)}  —  ${event.detail}`)
  }
  paragraph(`Final Status: ${formatStatus(fetched.status).toUpperCase()}`)

  heading('Ledger Comparison')
  paragraph(`Without Retry Protection (hypothetical): Total Debit Rs. ${fetched.amount * 2}`)
  paragraph(`With Retry Protection (Idempotency): Total Debit Rs. ${fetched.amount}`)

  if (aiReport) {
    heading('AI Root Cause Summary')
    paragraph(aiReport.summary)
    y += 6
    paragraph('Key Factors:')
    for (const factor of aiReport.keyFactors) {
      paragraph(`•  ${factor}`)
    }
  }

  doc.save(`retryshield-report-${toReferenceNumber(fetched.idempotencyKey)}.pdf`)
}

export function IncidentTimeline() {
  const { transaction, aiReport } = useTransaction()
  const navigate = useNavigate()
  const showToast = useToast()

  const [fetched, setFetched] = useState<FetchedTransaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!transaction) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/transactions/${transaction.idempotencyKey}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Failed to load transaction')
        return body.transaction as FetchedTransaction
      })
      .then((data) => {
        if (!cancelled) setFetched(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getFriendlyErrorMessage(err, 'Failed to load transaction'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [transaction, retryToken])

  function handleDownloadReport() {
    if (!fetched) return
    buildReportPdf(fetched, aiReport)
    showToast('Report downloaded', 'info')
  }

  return (
    <PageLayout
      headerRight={
        transaction && (
          <span className="inline-flex max-w-[260px] items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-muted dark:border-slate-700 dark:bg-slate-800/60">
            <span className="flex-shrink-0 whitespace-nowrap">Simulation ID:</span>
            <span className="min-w-0 flex-1 truncate font-mono text-slate-700 dark:text-slate-200">
              {toReferenceNumber(transaction.idempotencyKey)}
            </span>
          </span>
        )
      }
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Incident Timeline</h1>
        <p className="mt-1 text-sm text-muted">
          A step-by-step replay of every event recorded for this transaction.
        </p>

        {!transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 text-center shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
            <p className="text-muted">Start a payment first to see its incident timeline.</p>
            <button
              type="button"
              onClick={() => navigate('/payment-flow')}
              className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover"
            >
              Go to Payment Flow Simulator
            </button>
          </section>
        ) : isLoading ? (
          <TimelineSkeleton />
        ) : error ? (
          <div className="mt-8">
            <ErrorState message={error} onRetry={() => setRetryToken((n) => n + 1)} />
          </div>
        ) : fetched ? (
          <>
            <section className="mt-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
              <ol className="relative border-l-2 border-brand-primary/30 pl-8">
                {fetched.events.map((event, i) => (
                  <li key={`${event.step}-${i}`} className="relative pb-8 last:pb-0">
                    <span className="absolute -left-10 top-0.5 h-4 w-4 rounded-full border-2 border-brand-primary bg-white dark:bg-slate-900" />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                      <span className="w-36 flex-shrink-0 font-mono text-xs text-muted">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      <span className="text-slate-700 dark:text-slate-200">{event.detail}</span>
                    </div>
                  </li>
                ))}

                <li className="relative">
                  <span className="absolute -left-10 top-0.5 h-4 w-4 rounded-full border-2 border-brand-primary bg-white dark:bg-slate-900" />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                    <span className="w-36 flex-shrink-0 font-mono text-xs text-muted">—</span>
                    <span className={`font-bold ${FINAL_STATUS_COLOR[fetched.status] ?? 'text-slate-700 dark:text-slate-200'}`}>
                      Final Status: {formatStatus(fetched.status).toUpperCase()}
                    </span>
                  </div>
                </li>
              </ol>
            </section>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/ai-analysis"
                className="inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover"
              >
                View AI Root Cause Analysis
              </Link>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <DownloadIcon />
                Download Report
              </button>
            </div>
          </>
        ) : null}
      </main>
    </PageLayout>
  )
}
