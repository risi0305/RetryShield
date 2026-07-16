import { QrCode, ScanQrCode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PaymentMethod, SimulatedScenario } from '../context/TransactionContext'
import { Toggle } from './Toggle'

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return (digits.match(/.{1,4}/g) ?? []).join(' ')
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function isExpiryValid(expiry: string) {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false
  const month = Number(match[1])
  if (month < 1 || month > 12) return false
  const expiresAt = new Date(2000 + Number(match[2]), month) // first of the month after expiry
  return expiresAt > new Date()
}

const NET_BANKING_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
]

export type DemoScenario = 'clean' | 'response_lost' | 'genuine_failure'

interface DemoPreset {
  scenario: DemoScenario
  label: string
  description: string
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    scenario: 'clean',
    label: 'Demo: Successful Payment',
    description: 'Processes normally — no failure simulated',
  },
  {
    scenario: 'response_lost',
    label: 'Demo: Response Lost (Duplicate Risk)',
    description: 'Succeeds on the backend, confirmation lost (~5s)',
  },
  {
    scenario: 'genuine_failure',
    label: 'Demo: Genuine Failure (Legitimate Retry)',
    description: 'Bank declines — a retry is a fresh charge',
  },
]

interface TransactionFormProps {
  amount: string
  onAmountChange: (value: string) => void
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (value: PaymentMethod) => void
  simulateFailure: boolean
  onSimulateFailureChange: (value: boolean) => void
  failureMode: SimulatedScenario
  onFailureModeChange: (value: SimulatedScenario) => void
  onApplyPreset: (scenario: DemoScenario) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function TransactionForm({
  amount,
  onAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  simulateFailure,
  onSimulateFailureChange,
  failureMode,
  onFailureModeChange,
  onApplyPreset,
  onSubmit,
  isSubmitting,
}: TransactionFormProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isCardStep = paymentMethod === 'Card'
  const isNetBankingStep = paymentMethod === 'Net Banking'
  const isQrStep = paymentMethod === 'QR'
  const isCardDetailsValid =
    !isCardStep || (cardNumber.replace(/\D/g, '').length === 16 && isExpiryValid(cardExpiry) && /^\d{3,4}$/.test(cardCvv))
  const isNetBankingValid = !isNetBankingStep || selectedBank !== ''
  const canScan = !isSubmitting && !isScanning && Number(amount) > 0

  function handleScan() {
    if (!canScan) return
    setIsScanning(true)
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false)
      onSubmit()
    }, 900)
  }

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
    }
  }, [])

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Transaction Details</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Amount (₹)
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. 500"
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Payment Method
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Net Banking">Net Banking</option>
            <option value="QR">QR</option>
          </select>
        </label>
      </div>

      {isCardStep && (
        <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Card Number
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              disabled={isSubmitting}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 font-mono text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              Expiry (MM/YY)
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                disabled={isSubmitting}
                placeholder="MM/YY"
                maxLength={5}
                className="rounded-lg border border-slate-300 bg-surface px-3 py-2 font-mono text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-muted">
              CVV
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={isSubmitting}
                placeholder="123"
                maxLength={4}
                className="rounded-lg border border-slate-300 bg-surface px-3 py-2 font-mono text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
        </div>
      )}

      {isNetBankingStep && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Select Bank
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">— Choose your bank —</option>
              {NET_BANKING_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {isQrStep && (
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={handleScan}
            disabled={!canScan}
            aria-label="Simulate scanning this QR code"
            className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isScanning
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                : 'border-slate-300 bg-surface text-slate-700 hover:border-brand-primary/50 hover:bg-brand-primary/5 dark:border-slate-700 dark:bg-surface-dark dark:text-slate-200 dark:hover:border-brand-primary/50 dark:hover:bg-slate-800'
            }`}
          >
            {isScanning ? (
              <ScanQrCode size={32} strokeWidth={1.5} className="animate-pulse" />
            ) : (
              <QrCode size={32} strokeWidth={1.5} />
            )}
          </button>
          <div className="text-sm text-muted">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {isScanning ? 'Scanning…' : Number(amount) > 0 ? `Scan to pay ₹${amount}` : 'Scan to pay'}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {isScanning
                ? 'Payment starts automatically once the scan completes.'
                : 'Tap the code to simulate a customer scanning it with their UPI app.'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Quick Demo Presets</h3>
        <p className="mt-1 text-xs text-muted">
          Fills in the scenario below and starts the payment automatically.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {DEMO_PRESETS.map((preset) => {
            const isActive =
              preset.scenario === 'clean'
                ? !simulateFailure
                : simulateFailure && failureMode === preset.scenario

            return (
              <button
                key={preset.scenario}
                type="button"
                onClick={() => onApplyPreset(preset.scenario)}
                disabled={isSubmitting}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-brand-primary/40 hover:bg-brand-primary/5 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-brand-primary/50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block font-semibold">{preset.label}</span>
                <span className="mt-1 block text-muted">{preset.description}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          <Toggle
            label="Simulate a network failure on this payment"
            checked={simulateFailure}
            onChange={onSimulateFailureChange}
            disabled={isSubmitting}
          />

          {simulateFailure && (
            <label className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
              Failure Mode
              <select
                value={failureMode}
                onChange={(e) => onFailureModeChange(e.target.value as SimulatedScenario)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="response_lost">Response Lost After Success</option>
                <option value="genuine_failure">Payment Genuinely Failed</option>
              </select>
              <span className="text-xs text-muted">
                {failureMode === 'response_lost'
                  ? 'The payment actually succeeds on the backend, but the confirmation never reaches the customer.'
                  : 'The payment is actually declined by the bank — a retry is a legitimate new attempt.'}
              </span>
            </label>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || !amount || Number(amount) <= 0 || !isCardDetailsValid || !isNetBankingValid}
        className="mt-6 w-full rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Processing…' : 'Start Payment'}
      </button>
    </div>
  )
}
