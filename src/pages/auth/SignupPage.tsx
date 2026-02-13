import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '@/lib/supabase'

export function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validatePassword = (pwd: string) => {
    if (pwd.length < 12) return 'La password deve essere di almeno 12 caratteri'
    if (!/[A-Z]/.test(pwd)) return 'La password deve contenere almeno una maiuscola'
    if (!/[a-z]/.test(pwd)) return 'La password deve contenere almeno una minuscola'
    if (!/[0-9]/.test(pwd)) return 'La password deve contenere almeno un numero'
    if (!/[!@#$%^&*]/.test(pwd)) return 'La password deve contenere almeno un carattere speciale (!@#$%^&*)'
    return null
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    try {
      await signUp(email, password, fullName)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione fallita')
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-4 text-center text-2xl font-bold text-foreground">
              Controlla la tua email!
            </h2>
            <p className="mb-6 text-center text-muted-foreground">
              Ti abbiamo inviato un'email a <strong className="text-foreground">{email}</strong>. Clicca sul link per confermare il tuo account.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Vai al Login
            </button>
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
            <h1 className="text-3xl font-bold text-foreground">WealthTracker</h1>
            <p className="mt-2 text-muted-foreground">Crea il tuo account</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                Nome completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Mario Rossi"
              />
            </div>

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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••••••"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Minimo 12 caratteri con maiuscole, minuscole, numeri e caratteri speciali
              </p>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-medium">Requisiti password:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li className={password.length >= 12 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                  {password.length >= 12 ? '✓' : '○'} Almeno 12 caratteri
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} Una lettera maiuscola
                </li>
                <li className={/[a-z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                  {/[a-z]/.test(password) ? '✓' : '○'} Una lettera minuscola
                </li>
                <li className={/[0-9]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                  {/[0-9]/.test(password) ? '✓' : '○'} Un numero
                </li>
                <li className={/[!@#$%^&*]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                  {/[!@#$%^&*]/.test(password) ? '✓' : '○'} Un carattere speciale (!@#$%^&*)
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creazione account...' : 'Crea Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Hai già un account?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
