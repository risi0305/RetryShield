import { RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-status-failed/40 bg-status-failed/5 py-10 text-center dark:bg-status-failed/10">
      <p className="text-sm text-status-failed">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-status-failed/40 px-3 py-1.5 text-sm font-medium text-status-failed transition-colors hover:bg-status-failed/10"
      >
        <RefreshCw size={14} strokeWidth={2} />
        Try Again
      </button>
    </div>
  )
}
