import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlowDiagram, FLOW_STEPS } from '../components/FlowDiagram'
import { PageLayout } from '../components/PageLayout'
import { TransactionForm, type DemoScenario } from '../components/TransactionForm'
import { useTransaction, type PaymentMethod, type SimulatedScenario } from '../context/TransactionContext'
import { useToast } from '../context/ToastContext'
import { getFriendlyErrorMessage } from '../utils/friendlyError'
import { toReferenceNumber } from '../utils/reference'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const STEP_DELAY_MS = 450
const PRESET_AUTO_SUBMIT_DELAY_MS = 600
const DEFAULT_PRESET_AMOUNT = '500'

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

function WarningIcon() {
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
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function XIcon() {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function PaymentFlowSimulator() {
  const { transaction, setTransaction, clearTransaction } = useTransaction()
  const navigate = useNavigate()
  const showToast = useToast()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [failureMode, setFailureMode] = useState<SimulatedScenario>('response_lost')
  const [activeStep, setActiveStep] = useState(-1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // True when the current result came from the "only one real attempt per
  // simulation" rule rather than whatever the failure toggle actually says —
  // used purely to word the Payment Failed card honestly.
  const [wasForcedFailure, setWasForcedFailure] = useState(false)

  const presetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Only the *first* Start Payment click in a simulation is allowed to
  // reflect the toggle/preset the user chose. Every click after that is
  // forced to fail until "New Simulation" resets this.
  const hasStartedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (presetTimeoutRef.current) clearTimeout(presetTimeoutRef.current)
    }
  }, [])

  function handleNewSimulation() {
    clearTransaction()
    setAmount('')
    setPaymentMethod('UPI')
    setSimulateFailure(false)
    setFailureMode('response_lost')
    setActiveStep(-1)
    setError(null)
    setWasForcedFailure(false)
    hasStartedRef.current = false
  }

  async function handleStartPayment(overrides?: {
    amount?: string
    simulateFailure?: boolean
    failureMode?: SimulatedScenario
  }) {
    const effectiveAmount = overrides?.amount ?? amount
    let effectiveSimulateFailure = overrides?.simulateFailure ?? simulateFailure
    let effectiveFailureMode = overrides?.failureMode ?? failureMode

    const parsedAmount = Number(effectiveAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return

    // Once this simulation has already produced one real attempt, every
    // further click fails by default — regardless of amount, method, or
    // failure settings — until the user explicitly starts a new simulation.
    const isRepeatAttempt = hasStartedRef.current
    if (isRepeatAttempt) {
      effectiveSimulateFailure = true
      effectiveFailureMode = 'genuine_failure'
    }
    hasStartedRef.current = true

    setError(null)
    setIsSubmitting(true)
    setActiveStep(-1)

    const idempotencyKey = crypto.randomUUID()

    const animate = (async () => {
      for (let i = 0; i < FLOW_STEPS.length; i++) {
        setActiveStep(i)
        await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS))
      }
    })()

    const request = fetch(`${API_BASE_URL}/api/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey,
        amount: parsedAmount,
        paymentMethod,
        simulateFailure: effectiveSimulateFailure,
        failureMode: effectiveSimulateFailure ? effectiveFailureMode : null,
      }),
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Payment request failed')
      return body
    })

    try {
      const [, body] = await Promise.all([animate, request])
      const scenario: SimulatedScenario | null = body.transaction.simulatedScenario ?? null
      setTransaction({
        idempotencyKey,
        amount: parsedAmount,
        paymentMethod,
        status: body.transaction.status,
        simulatedScenario: scenario,
      })
      setWasForcedFailure(isRepeatAttempt)

      if (isRepeatAttempt) {
        showToast('Payment failed — only one payment is allowed per simulation', 'error')
      } else if (scenario === 'genuine_failure') {
        showToast('Payment failed', 'error')
      } else if (scenario === 'response_lost') {
        showToast('Payment sent — awaiting confirmation', 'warning')
      } else {
        showToast('Payment processed successfully', 'success')
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Payment request failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleApplyPreset(scenario: DemoScenario) {
    const nextAmount = Number(amount) > 0 ? amount : DEFAULT_PRESET_AMOUNT
    const nextSimulateFailure = scenario !== 'clean'
    const nextFailureMode: SimulatedScenario = scenario === 'genuine_failure' ? 'genuine_failure' : 'response_lost'

    setAmount(nextAmount)
    setSimulateFailure(nextSimulateFailure)
    setFailureMode(nextFailureMode)

    if (presetTimeoutRef.current) clearTimeout(presetTimeoutRef.current)
    presetTimeoutRef.current = setTimeout(() => {
      handleStartPayment({
        amount: nextAmount,
        simulateFailure: nextSimulateFailure,
        failureMode: nextFailureMode,
      })
    }, PRESET_AUTO_SUBMIT_DELAY_MS)
  }

  const isCleanSuccess = transaction?.status === 'success' && !transaction.simulatedScenario
  const isAmbiguous = transaction?.status === 'success' && transaction.simulatedScenario === 'response_lost'
  const isGenuineFailure = transaction?.status === 'failed'

  return (
    <PageLayout
      headerRight={
        <button
          type="button"
          onClick={handleNewSimulation}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          New Simulation
        </button>
      }
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payment Flow Simulator</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Walk a payment through the full rail — customer, merchant, PSP, network, and issuing bank.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white/60 p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-black/20">
          <FlowDiagram activeStep={activeStep} complete={!isSubmitting && isCleanSuccess} />
        </section>

        <section className="mt-6">
          <TransactionForm
            amount={amount}
            onAmountChange={setAmount}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            simulateFailure={simulateFailure}
            onSimulateFailureChange={setSimulateFailure}
            failureMode={failureMode}
            onFailureModeChange={setFailureMode}
            onApplyPreset={handleApplyPreset}
            onSubmit={() => handleStartPayment()}
            isSubmitting={isSubmitting}
          />
        </section>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        )}

        {transaction && !isSubmitting && isCleanSuccess && (
          <section className="mt-6 rounded-2xl border border-l-4 border-slate-200 border-l-emerald-600 bg-slate-50 p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:border-l-emerald-500 dark:bg-slate-800/40 dark:shadow-black/20">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
                <CheckIcon />
              </span>
              <div>
                <h2 className="font-semibold text-emerald-700 dark:text-emerald-300">Payment Successful</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  The transaction completed end-to-end with no issues.
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-slate-500">Reference</dt>
              <dd className="col-span-1 truncate font-mono text-slate-700 dark:text-slate-200 sm:col-span-3">
                {toReferenceNumber(transaction.idempotencyKey)}
              </dd>
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-slate-700 dark:text-slate-200">₹{transaction.amount}</dd>
              <dt className="text-slate-500">Method</dt>
              <dd className="text-slate-700 dark:text-slate-200">{transaction.paymentMethod}</dd>
            </dl>
          </section>
        )}

        {transaction && !isSubmitting && isAmbiguous && (
          <section className="mt-6 rounded-2xl border border-l-4 border-slate-200 border-l-amber-600 bg-slate-50 p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:border-l-amber-500 dark:bg-slate-800/40 dark:shadow-black/20">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 animate-pulse items-center justify-center rounded-full bg-amber-600/15 text-amber-700 dark:text-amber-400">
                <WarningIcon />
              </span>
              <div>
                <h2 className="font-semibold text-amber-700 dark:text-amber-300">Response Not Received</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Request Sent to Bank — the confirmation never made it back. Status: UNKNOWN.
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-slate-500">Reference</dt>
              <dd className="col-span-1 truncate font-mono text-slate-700 dark:text-slate-200 sm:col-span-3">
                {toReferenceNumber(transaction.idempotencyKey)}
              </dd>
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-slate-700 dark:text-slate-200">₹{transaction.amount}</dd>
              <dt className="text-slate-500">Method</dt>
              <dd className="text-slate-700 dark:text-slate-200">{transaction.paymentMethod}</dd>
            </dl>
            <button
              type="button"
              onClick={() => navigate('/retry')}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Retry Payment
            </button>
          </section>
        )}

        {transaction && !isSubmitting && isGenuineFailure && (
          <section className="mt-6 rounded-2xl border border-l-4 border-slate-200 border-l-rose-600 bg-slate-50 p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:border-l-rose-500 dark:bg-slate-800/40 dark:shadow-black/20">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-600/15 text-rose-700 dark:text-rose-400">
                <XIcon />
              </span>
              <div>
                <h2 className="font-semibold text-rose-700 dark:text-rose-300">Payment Failed</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {wasForcedFailure
                    ? 'Only one payment attempt is allowed per simulation — no charge was made.'
                    : 'The bank declined the transaction — no charge was made.'}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-slate-500">Reference</dt>
              <dd className="col-span-1 truncate font-mono text-slate-700 dark:text-slate-200 sm:col-span-3">
                {toReferenceNumber(transaction.idempotencyKey)}
              </dd>
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-slate-700 dark:text-slate-200">₹{transaction.amount}</dd>
              <dt className="text-slate-500">Method</dt>
              <dd className="text-slate-700 dark:text-slate-200">{transaction.paymentMethod}</dd>
            </dl>
            {wasForcedFailure ? (
              <button
                type="button"
                onClick={handleNewSimulation}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Start New Simulation
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/retry')}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Retry Payment
              </button>
            )}
          </section>
        )}
      </main>
    </PageLayout>
  )
}
