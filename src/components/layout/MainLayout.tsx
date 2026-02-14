import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  Home,
  Briefcase,
  Calculator,
  Settings,
  LogOut,
} from 'lucide-react'

export function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Portfolios', href: '/portfolios', icon: Briefcase },
    { name: 'Tasse', href: '/taxes', icon: Calculator },
    { name: 'Impostazioni', href: '/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/portfolios') {
      return location.pathname === '/portfolios' || location.pathname.startsWith('/portfolios/')
    }
    return location.pathname === href
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar with integrated tabs */}
      <nav className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-lg font-bold text-foreground">WealthTracker</h1>

              {/* Desktop tabs */}
              <div className="hidden items-center gap-1 md:flex">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground lg:block">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile tabs - horizontal scroll */}
        <div className="border-t border-border md:hidden">
          <div className="mx-auto max-w-7xl px-4">
            <div className="-mb-px flex gap-1 overflow-x-auto py-1 scrollbar-none">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Full width */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
