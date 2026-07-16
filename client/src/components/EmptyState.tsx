import { Link } from 'react-router-dom'

interface EmptyStateProps {
  message: string
  actionLabel?: string
  actionTo?: string
}

export function EmptyState({ message, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
      <p className="text-sm text-muted">{message}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="text-sm font-medium text-brand-primary hover:underline">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
