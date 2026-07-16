import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7 flex-shrink-0 text-brand-primary"
    >
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L14.5 10" />
    </svg>
  )
}

export function Header({ right, tagline }: { right?: ReactNode; tagline?: string }) {
  return (
    <header className="border-b border-slate-200 bg-surface/80 backdrop-blur dark:border-slate-800 dark:bg-surface-dark/80">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <ShieldIcon />
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                RetryShield
              </span>
              {tagline && <span className="text-xs font-medium text-muted">{tagline}</span>}
            </span>
          </Link>
          <ThemeToggle />
          <Link
            to="/dashboard"
            className="text-sm font-medium text-muted transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          >
            Dashboard
          </Link>
          <Link
            to="/history"
            className="text-sm font-medium text-muted transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          >
            History
          </Link>
          <Link
            to="/scenario-comparison"
            className="text-sm font-medium text-muted transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          >
            Compare
          </Link>
        </div>
        {right && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{right}</div>}
      </div>
    </header>
  )
}
