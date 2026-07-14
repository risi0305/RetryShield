import type { ReactNode } from 'react'

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-blue-500"
    >
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L14.5 10" />
    </svg>
  )
}

export function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldIcon />
          <span className="text-lg font-semibold tracking-tight text-slate-100">RetryShield</span>
        </div>
        {right && <div className="flex items-center gap-3">{right}</div>}
      </div>
    </header>
  )
}
