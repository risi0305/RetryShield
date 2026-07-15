import { Link } from 'react-router-dom'

interface EmptyStateProps {
  message: string
  actionLabel?: string
  actionTo?: string
}

export function EmptyState({ message, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
