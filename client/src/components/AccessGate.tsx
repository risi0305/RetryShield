import { type FormEvent, type ReactNode, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
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
      className="h-6 w-6"
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
      const res = await fetch(`${API_BASE_URL}/api/access/verify`, {
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <ShieldIcon />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">RetryShield</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter the access code to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            disabled={isVerifying}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isVerifying || !code.trim()}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white shadow-md shadow-black/10 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isVerifying ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
