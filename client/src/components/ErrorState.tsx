import { RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-rose-300 bg-rose-50/50 py-10 text-center dark:border-rose-900 dark:bg-rose-950/20">
      <p className="text-sm text-rose-700 dark:text-rose-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40"
      >
        <RefreshCw size={14} strokeWidth={2} />
        Try Again
      </button>
    </div>
  )
}
