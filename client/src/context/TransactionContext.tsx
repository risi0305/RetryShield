import { createContext, useContext, useState, type ReactNode } from 'react'

export type PaymentMethod = 'UPI' | 'Card'

export interface TransactionSummary {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: string
}

interface TransactionContextValue {
  transaction: TransactionSummary | null
  setTransaction: (transaction: TransactionSummary) => void
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined)

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transaction, setTransaction] = useState<TransactionSummary | null>(null)

  return (
    <TransactionContext.Provider value={{ transaction, setTransaction }}>
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransaction() {
  const ctx = useContext(TransactionContext)
  if (!ctx) {
    throw new Error('useTransaction must be used within a TransactionProvider')
  }
  return ctx
}
