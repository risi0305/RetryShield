type BadgeColor = 'green' | 'red' | 'blue' | 'slate'

const DOT_COLOR: Record<BadgeColor, string> = {
  green: 'bg-emerald-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
  slate: 'bg-slate-500',
}

const TEXT_COLOR: Record<BadgeColor, string> = {
  green: 'text-emerald-300',
  red: 'text-red-300',
  blue: 'text-blue-300',
  slate: 'text-slate-400',
}

const PULSE_COLORS: BadgeColor[] = ['green', 'blue']

interface StatusBadgeProps {
  label: string
  color: BadgeColor
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium ${TEXT_COLOR[color]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT_COLOR[color]} ${PULSE_COLORS.includes(color) ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
