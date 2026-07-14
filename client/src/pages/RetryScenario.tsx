import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { useTransaction } from '../context/TransactionContext'

export function RetryScenario() {
  const { transaction } = useTransaction()

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-100">Retry Scenario</h1>
        <p className="mt-1 text-sm text-slate-400">
          Coming soon — replay and retry logic for the injected failure.
        </p>

        {transaction ? (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20">
            <dl className="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-slate-500">Idempotency Key</dt>
              <dd className="col-span-1 truncate font-mono text-slate-200 sm:col-span-3">
                {transaction.idempotencyKey}
              </dd>
              <dt className="text-slate-500">Failure Type</dt>
              <dd className="text-slate-200">{transaction.failureType ?? '—'}</dd>
              <dt className="text-slate-500">Failure Point</dt>
              <dd className="text-slate-200">{transaction.failurePoint ?? '—'}</dd>
            </dl>
          </section>
        ) : (
          <Link to="/" className="mt-6 inline-block text-blue-400 hover:underline">
            Start a new payment
          </Link>
        )}
      </main>
    </div>
  )
}
