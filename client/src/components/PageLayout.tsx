import type { ReactNode } from 'react'
import { Header } from './Header'
import { StepIndicator } from './StepIndicator'

export function PageLayout({
  headerRight,
  headerTagline,
  showSteps = true,
  children,
}: {
  headerRight?: ReactNode
  headerTagline?: string
  showSteps?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-bg-dark">
      <Header right={headerRight} tagline={headerTagline} />
      {showSteps && <StepIndicator />}
      {children}
    </div>
  )
}
