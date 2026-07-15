import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlowDiagram, FLOW_STEPS } from '../components/FlowDiagram'
import { PageLayout } from '../components/PageLayout'
import { TransactionForm } from '../components/TransactionForm'
import { useTransaction, type PaymentMethod } from '../context/TransactionContext'
import { useToast } from '../context/ToastContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const STEP_DELAY_MS = 450

export function PaymentFlowSimulator() {
  const { transaction, setTransaction, clearTransaction } = useTransaction()
  const navigate = useNavigate()
  const showToast = useToast()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [activeStep, setActiveStep] = useState(-1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNewSimulation() {
    clearTransaction()
    setAmount('')
    setPaymentMethod('UPI')
    setActiveStep(-1)
    setError(null)
  }

  async function handleStartPayment() {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return

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
      body: JSON.stringify({ idempotencyKey, amount: parsedAmount, paymentMethod }),
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Payment request failed')
      return body
    })

    try {
      const [, body] = await Promise.all([animate, request])
      setTransaction({
        idempotencyKey,
        amount: parsedAmount,
        paymentMethod,
        status: body.transaction.status,
      })
      showToast('Payment initiated', 'info')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <FlowDiagram activeStep={activeStep} />
        </section>

        <section className="mt-6">
          <TransactionForm
            amount={amount}
            onAmountChange={setAmount}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onSubmit={handleStartPayment}
            isSubmitting={isSubmitting}
          />
        </section>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        )}

        {transaction && !isSubmitting && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Last Transaction
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-slate-500">Idempotency Key</dt>
              <dd className="col-span-1 truncate font-mono text-slate-700 dark:text-slate-200 sm:col-span-3">
                {transaction.idempotencyKey}
              </dd>
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-slate-700 dark:text-slate-200">₹{transaction.amount}</dd>
              <dt className="text-slate-500">Method</dt>
              <dd className="text-slate-700 dark:text-slate-200">{transaction.paymentMethod}</dd>
              <dt className="text-slate-500">Status</dt>
              <dd className="text-slate-700 dark:text-slate-200">{transaction.status}</dd>
            </dl>
            <button
              type="button"
              onClick={() => navigate('/failure-injection')}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Continue to Failure Injection
            </button>
          </section>
        )}
      </main>
    </PageLayout>
  )
}
