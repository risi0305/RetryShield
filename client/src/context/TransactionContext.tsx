import { createContext, useContext, useState, type ReactNode } from 'react'

export type PaymentMethod = 'UPI' | 'Card' | 'Net Banking' | 'QR'

export type FailureType =
  | 'Network Lost After Request Sent'
  | 'Timeout Before Response'
  | 'Partial Response Received'

export type FailurePoint =
  | 'Between Customer and Merchant'
  | 'Between PSP and Bank'
  | 'Between Bank and PSP (response)'

export type SimulatedScenario = 'response_lost' | 'genuine_failure'

export interface TransactionSummary {
  idempotencyKey: string
  amount: number
  paymentMethod: PaymentMethod
  status: string
  simulatedScenario?: SimulatedScenario | null
  failureType?: FailureType | null
  failurePoint?: FailurePoint | null
}

export interface AiReportSummary {
  summary: string
  keyFactors: string[]
}

interface TransactionContextValue {
  transaction: TransactionSummary | null
  setTransaction: (transaction: TransactionSummary) => void
  clearTransaction: () => void
  aiReport: AiReportSummary | null
  setAiReport: (report: AiReportSummary | null) => void
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined)

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transaction, setTransactionState] = useState<TransactionSummary | null>(null)
  const [aiReport, setAiReport] = useState<AiReportSummary | null>(null)

  function setTransaction(next: TransactionSummary) {
    // Switching to a different transaction (e.g. via History) invalidates any
    // AI report generated for the previous one — updates to the *same*
    // transaction (failureType, status, ...) should leave it alone.
    if (!transaction || transaction.idempotencyKey !== next.idempotencyKey) {
      setAiReport(null)
    }
    setTransactionState(next)
  }

  function clearTransaction() {
    setTransactionState(null)
    setAiReport(null)
  }

  return (
    <TransactionContext.Provider value={{ transaction, setTransaction, clearTransaction, aiReport, setAiReport }}>
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
