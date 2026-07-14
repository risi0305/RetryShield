type BadgeColor = 'green' | 'red' | 'slate'

const DOT_COLOR: Record<BadgeColor, string> = {
  green: 'bg-emerald-400',
  red: 'bg-red-400',
  slate: 'bg-slate-500',
}

const TEXT_COLOR: Record<BadgeColor, string> = {
  green: 'text-emerald-300',
  red: 'text-red-300',
  slate: 'text-slate-400',
}

interface StatusBadgeProps {
  label: string
  color: BadgeColor
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium ${TEXT_COLOR[color]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT_COLOR[color]} ${color === 'green' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
