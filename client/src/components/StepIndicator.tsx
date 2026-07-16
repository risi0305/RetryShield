import { Link, useLocation } from 'react-router-dom'

const STEPS = [
  { path: '/payment-flow', label: 'Payment Flow' },
  { path: '/failure-injection', label: 'Failure Injection' },
  { path: '/retry', label: 'Retry Scenario' },
  { path: '/ledger-comparison', label: 'Ledger Comparison' },
  { path: '/incident-timeline', label: 'Incident Timeline' },
  { path: '/ai-analysis', label: 'AI Root Cause' },
]

export function StepIndicator() {
  const location = useLocation()
  const currentIndex = STEPS.findIndex((step) => step.path === location.pathname)

  return (
    <nav className="border-b border-slate-200 bg-app-bg dark:border-slate-800 dark:bg-app-bg-dark">
      <div className="flex w-full items-center gap-1.5 overflow-x-auto px-4 py-3 sm:px-8">
        {STEPS.map((step, i) => {
          const isActive = i === currentIndex
          const isDone = currentIndex >= 0 && i < currentIndex

          return (
            <div key={step.path} className="flex flex-shrink-0 items-center gap-1.5">
              <Link
                to={step.path}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : isDone
                      ? 'border-slate-300 bg-slate-200/60 text-slate-600 hover:border-brand-primary/40 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : isDone
                        ? 'bg-slate-400 text-slate-900 dark:bg-slate-600 dark:text-slate-200'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                >
                  {i + 1}
                </span>
                {step.label}
              </Link>
              {i < STEPS.length - 1 && <span className="text-slate-300 dark:text-slate-700">→</span>}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
