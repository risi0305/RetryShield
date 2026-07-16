export const FLOW_STEPS = [
  'Customer (UPI/Card)',
  'Merchant / POS',
  'PSP / Acquiring Bank',
  'Network',
  'Issuing Bank',
] as const

function ArrowIcon({ lit, complete }: { lit: boolean; complete: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-300 ${
        lit
          ? complete
            ? 'text-status-success'
            : 'text-brand-primary'
          : 'text-slate-300 dark:text-slate-700'
      }`}
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

interface FlowDiagramProps {
  /** -1 = nothing lit yet; N = steps [0..N] are lit */
  activeStep: number
  /** true once the payment has genuinely completed with no failure — lights the whole rail green */
  complete?: boolean
}

export function FlowDiagram({ activeStep, complete = false }: FlowDiagramProps) {
  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
      {FLOW_STEPS.map((step, i) => {
        const isLit = activeStep >= i
        const isSuccess = complete && isLit
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex min-w-[110px] flex-col items-center gap-2 rounded-xl border px-4 py-3 text-center text-xs font-medium transition-all duration-300 ${
                isSuccess
                  ? 'border-status-success bg-status-success/10 text-status-success shadow-[0_0_0_3px_rgba(16,185,129,0.12)]'
                  : isLit
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'
                    : 'border-slate-300 bg-slate-100 text-muted dark:border-slate-700 dark:bg-slate-800/50'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                  isSuccess ? 'bg-status-success' : isLit ? 'animate-pulse bg-brand-primary' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              />
              {step}
            </div>
            {i < FLOW_STEPS.length - 1 && <ArrowIcon lit={activeStep > i} complete={complete} />}
          </div>
        )
      })}
    </div>
  )
}
