import type { PaymentMethod } from '../context/TransactionContext'

interface TransactionFormProps {
  amount: string
  onAmountChange: (value: string) => void
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (value: PaymentMethod) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function TransactionForm({
  amount,
  onAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  onSubmit,
  isSubmitting,
}: TransactionFormProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Transaction Details
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-slate-600 dark:text-slate-300">
          Amount (₹)
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. 500"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-600 dark:text-slate-300">
          Payment Method
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || !amount || Number(amount) <= 0}
        className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Processing…' : 'Start Payment'}
      </button>
    </div>
  )
}
