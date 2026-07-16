import {
  CreditCard,
  GitCompare,
  History as HistoryIcon,
  LayoutDashboard,
  List,
  RefreshCw,
  Scale,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'

interface MenuItem {
  to: string
  label: string
  description: string
  icon: LucideIcon
  iconClasses: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    description: 'Overview of every payment incident simulated so far.',
    icon: LayoutDashboard,
    iconClasses: 'bg-brand-primary/10 text-brand-primary',
  },
  {
    to: '/payment-flow',
    label: 'Payment Flow Simulator',
    description: 'Walk a payment through the full rail, from customer to issuing bank.',
    icon: CreditCard,
    iconClasses: 'bg-slate-100 text-muted dark:bg-slate-800',
  },
  {
    to: '/failure-injection',
    label: 'Failure Injection',
    description: "Configure how and where a transaction's network path should fail.",
    icon: Zap,
    iconClasses: 'bg-status-warning/10 text-status-warning',
  },
  {
    to: '/retry',
    label: 'Retry Scenario',
    description: 'Resolve an unconfirmed payment and watch idempotency protection hold.',
    icon: RefreshCw,
    iconClasses: 'bg-slate-100 text-muted dark:bg-slate-800',
  },
  {
    to: '/ledger-comparison',
    label: 'Ledger Comparison',
    description: "See a transaction's ledger with and without idempotency protection.",
    icon: Scale,
    iconClasses: 'bg-status-success/10 text-status-success',
  },
  {
    to: '/incident-timeline',
    label: 'Incident Timeline',
    description: 'A step-by-step replay of every event recorded for a transaction.',
    icon: HistoryIcon,
    iconClasses: 'bg-slate-100 text-muted dark:bg-slate-800',
  },
  {
    to: '/ai-analysis',
    label: 'AI Root Cause Analysis',
    description: 'Let AI read the incident timeline and summarize what happened.',
    icon: Sparkles,
    iconClasses: 'bg-status-duplicate/10 text-status-duplicate',
  },
  {
    to: '/history',
    label: 'History',
    description: "Every simulation you've run, across all sessions — searchable and filterable.",
    icon: List,
    iconClasses: 'bg-slate-100 text-muted dark:bg-slate-800',
  },
  {
    to: '/scenario-comparison',
    label: 'Scenario Comparison',
    description: 'Pick 2–3 past simulations and compare their outcomes side by side.',
    icon: GitCompare,
    iconClasses: 'bg-slate-100 text-muted dark:bg-slate-800',
  },
]

function MenuCard({ item }: { item: MenuItem }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconClasses}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <h2 className="mt-4 font-semibold text-slate-900 group-hover:text-brand-primary dark:text-slate-100">
        {item.label}
      </h2>
      <p className="mt-1 text-sm text-muted">{item.description}</p>
    </Link>
  )
}

export function Menu() {
  return (
    <PageLayout showSteps={false}>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100"></h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MENU_ITEMS.map((item) => (
            <MenuCard key={item.to} item={item} />
          ))}
        </div>
      </main>
    </PageLayout>
  )
}
