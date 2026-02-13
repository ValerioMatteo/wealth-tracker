import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase, updatePassword } from '@/lib/supabase'
import { Settings, User, Shield, Bell, Save } from 'lucide-react'
import { applyTheme } from '@/hooks/useTheme'
import type { Currency, UserPreferences } from '@/types'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF', 'JPY']

export function SettingsPage() {
  const { user } = useAuthStore()

  const [fullName, setFullName] = useState('')
  const [preferences, setPreferences] = useState<UserPreferences>({
    default_currency: 'EUR',
    date_format: 'DD/MM/YYYY',
    theme: 'light',
    notifications_enabled: true,
    email_reports: false,
  })

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user?.profile) {
      setFullName(user.profile.full_name || '')
      if (user.profile.preferences) {
        setPreferences(prev => ({ ...prev, ...user.profile.preferences }))
      }
    }
  }, [user])

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        preferences,
      })
      .eq('user_id', user?.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profilo aggiornato con successo' })
    }
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non coincidono' })
      return
    }
    if (newPassword.length < 12) {
      setMessage({ type: 'error', text: 'La password deve essere di almeno 12 caratteri' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await updatePassword(newPassword)
      setMessage({ type: 'success', text: 'Password aggiornata con successo' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Errore durante il cambio password'
      setMessage({ type: 'error', text: errMsg })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">Gestisci il tuo account e le preferenze</p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`rounded-xl border p-4 ${
          message.type === 'success' ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 text-red-600 dark:text-red-400'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Profilo</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-muted-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Nome Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              placeholder="Il tuo nome"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Abbonamento</label>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {user?.profile?.subscription_tier || 'free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Preferenze</h2>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Valuta Predefinita</label>
              <select
                value={preferences.default_currency}
                onChange={e => setPreferences({ ...preferences, default_currency: e.target.value as Currency })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Formato Data</label>
              <select
                value={preferences.date_format}
                onChange={e => setPreferences({ ...preferences, date_format: e.target.value as 'DD/MM/YYYY' | 'MM/DD/YYYY' })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Tema</label>
            <select
              value={preferences.theme}
              onChange={e => {
                const newTheme = e.target.value as 'light' | 'dark' | 'system'
                setPreferences({ ...preferences, theme: newTheme })
                applyTheme(newTheme)
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
            >
              <option value="dark">Scuro</option>
              <option value="light">Chiaro</option>
              <option value="system">Sistema</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notifiche</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-foreground">Notifiche Push</span>
            <input
              type="checkbox"
              checked={preferences.notifications_enabled}
              onChange={e => setPreferences({ ...preferences, notifications_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-primary"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-foreground">Report via Email</span>
            <input
              type="checkbox"
              checked={preferences.email_reports}
              onChange={e => setPreferences({ ...preferences, email_reports: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-primary"
            />
          </label>
        </div>
      </div>

      {/* Save Profile */}
      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> {saving ? 'Salvataggio...' : 'Salva Modifiche'}
      </button>

      {/* Security Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Sicurezza</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Nuova Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              placeholder="Minimo 12 caratteri"
              minLength={12}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Conferma Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              placeholder="Ripeti la password"
              minLength={12}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newPassword || !confirmPassword}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            Cambia Password
          </button>
        </form>
      </div>
    </div>
  )
}
