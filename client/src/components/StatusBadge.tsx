type BadgeColor = 'green' | 'red' | 'blue' | 'slate'

const DOT_COLOR: Record<BadgeColor, string> = {
  green: 'bg-status-success',
  red: 'bg-status-failed',
  blue: 'bg-brand-primary',
  slate: 'bg-slate-500',
}

const TEXT_COLOR: Record<BadgeColor, string> = {
  green: 'text-status-success',
  red: 'text-status-failed',
  blue: 'text-brand-primary',
  slate: 'text-muted',
}

const PULSE_COLORS: BadgeColor[] = ['green', 'blue']

interface StatusBadgeProps {
  label: string
  color: BadgeColor
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800/60 ${TEXT_COLOR[color]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT_COLOR[color]} ${PULSE_COLORS.includes(color) ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
