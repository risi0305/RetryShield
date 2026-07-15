import { useEffect, useState } from 'react'
import { useToastList, type ToastItem, type ToastVariant } from '../context/ToastContext'

const DISPLAY_DURATION_MS = 3500
const EXIT_ANIMATION_MS = 200

const VARIANT_BORDER: Record<ToastVariant, string> = {
  info: 'border-blue-600/40',
  success: 'border-emerald-600/40',
  warning: 'border-amber-600/40',
  ai: 'border-violet-600/40',
}

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  info: 'text-blue-700 dark:text-blue-400',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  ai: 'text-violet-700 dark:text-purple-400',
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case 'success':
      return <CheckIcon />
    case 'warning':
      return <WarningIcon />
    case 'ai':
      return <SparkleIcon />
    default:
      return <InfoIcon />
  }
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering')

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setPhase('visible'))
    const exitTimer = setTimeout(() => setPhase('exiting'), DISPLAY_DURATION_MS)
    return () => {
      cancelAnimationFrame(enterFrame)
      clearTimeout(exitTimer)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'exiting') return
    const removeTimer = setTimeout(() => onDismiss(toast.id), EXIT_ANIMATION_MS)
    return () => clearTimeout(removeTimer)
  }, [phase, onDismiss, toast.id])

  const isVisible = phase === 'visible'

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg shadow-black/10 transition-all duration-200 dark:bg-slate-900 dark:shadow-black/30 ${
        VARIANT_BORDER[toast.variant]
      } ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${VARIANT_ICON_COLOR[toast.variant]}`}>
        <ToastIcon variant={toast.variant} />
      </span>
      <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{toast.message}</p>
      <button
        type="button"
        onClick={() => setPhase('exiting')}
        aria-label="Dismiss"
        className="flex-shrink-0 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToastList()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-50 flex w-full max-w-sm flex-col gap-2 sm:right-6">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
