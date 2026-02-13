import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '@/lib/supabase'

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-8 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                <svg
                  className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-4 text-center text-2xl font-bold text-foreground">
              Email inviata!
            </h2>
            <p className="mb-6 text-center text-muted-foreground">
              Controlla la tua email <strong className="text-foreground">{email}</strong> per le istruzioni su come resettare la password.
            </p>
            <Link
              to="/login"
              className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Torna al Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="mt-2 text-muted-foreground">
              Inserisci la tua email per ricevere le istruzioni
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="tuo@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Invio in corso...' : 'Invia link di reset'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ricordi la password?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
