import { type FormEvent, type ReactNode, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const SESSION_KEY = 'retryshield-access-granted'

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L14.5 10" />
    </svg>
  )
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || isVerifying) return

    setIsVerifying(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/access/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = await res.json()
      if (res.ok && body.valid) {
        sessionStorage.setItem(SESSION_KEY, 'true')
        setIsUnlocked(true)
      } else {
        setError('Incorrect access code.')
      }
    } catch {
      setError("Can't reach the server — check your connection and try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  if (isUnlocked) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 dark:bg-app-bg-dark">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-surface p-8 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface-dark dark:shadow-black/20">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <ShieldIcon />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">RetryShield</h1>
          <p className="mt-1 text-sm text-muted">Enter the access code to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            disabled={isVerifying}
            className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-slate-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          {error && (
            <p className="rounded-lg border border-status-failed/30 bg-status-failed/5 px-3 py-2 text-sm text-status-failed dark:bg-status-failed/10">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isVerifying || !code.trim()}
            className="w-full rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVerifying ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
