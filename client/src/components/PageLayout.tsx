import type { ReactNode } from 'react'
import { Header } from './Header'
import { StepIndicator } from './StepIndicator'

export function PageLayout({
  headerRight,
  showSteps = true,
  children,
}: {
  headerRight?: ReactNode
  showSteps?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header right={headerRight} />
      {showSteps && <StepIndicator />}
      {children}
    </div>
  )
}
