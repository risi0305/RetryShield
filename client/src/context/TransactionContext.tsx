import { createContext, useContext, useState, type ReactNode } from 'react'

export type PaymentMethod = 'UPI' | 'Card'

export type FailureType =
  | 'Network Lost After Request Sent'
  | 'Timeout Before Response'
  | 'Partial Response Received'

export type FailurePoint =
  | 'Between Customer and Merchant'
  | 'Between PSP and Bank'
  | 'Between Bank and PSP (response)'

export interface TransactionSummary {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: string
  failureType?: FailureType | null
  failurePoint?: FailurePoint | null
}

interface TransactionContextValue {
  transaction: TransactionSummary | null
  setTransaction: (transaction: TransactionSummary) => void
  clearTransaction: () => void
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined)

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transaction, setTransaction] = useState<TransactionSummary | null>(null)

  const clearTransaction = () => setTransaction(null)

  return (
    <TransactionContext.Provider value={{ transaction, setTransaction, clearTransaction }}>
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
