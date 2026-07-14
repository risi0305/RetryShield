export const FLOW_STEPS = [
  'Customer (UPI/Card)',
  'Merchant / POS',
  'PSP / Acquiring Bank',
  'Network',
  'Issuing Bank',
] as const

function ArrowIcon({ lit }: { lit: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-300 ${
        lit ? 'text-blue-400' : 'text-slate-700'
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
}

export function FlowDiagram({ activeStep }: FlowDiagramProps) {
  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
      {FLOW_STEPS.map((step, i) => {
        const isLit = activeStep >= i
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex min-w-[110px] flex-col items-center gap-2 rounded-xl border px-4 py-3 text-center text-xs font-medium transition-all duration-300 ${
                isLit
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                  isLit ? 'animate-pulse bg-blue-400' : 'bg-slate-600'
                }`}
              />
              {step}
            </div>
            {i < FLOW_STEPS.length - 1 && <ArrowIcon lit={activeStep > i} />}
          </div>
        )
      })}
    </div>
  )
}
