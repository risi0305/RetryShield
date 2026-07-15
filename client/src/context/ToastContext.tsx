import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'ai'

export interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, variant }])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>{children}</ToastContext.Provider>
  )
}

function useToastContext() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

/** Pages just want to fire a toast — this is the hook to reach for. */
export function useToast() {
  return useToastContext().showToast
}

/** Used only by ToastContainer to render and dismiss the active list. */
export function useToastList() {
  return useToastContext()
}
