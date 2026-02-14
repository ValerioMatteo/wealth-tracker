import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTheme } from '@/hooks/useTheme'

// Layout
import { MainLayout } from '@/components/layout/MainLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

// Pages
import { DashboardPage } from '@/pages/DashboardPage'
import { PortfoliosPage } from '@/pages/PortfoliosPage'
import { PortfolioDetailPage } from '@/pages/PortfolioDetailPage'
import { TaxesPage } from '@/pages/TaxesPage'
import { SettingsPage } from '@/pages/SettingsPage'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
localStorage.clear();
// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-primary"></div>
          <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-primary"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  const initialize = useAuthStore((state) => state.initialize)
  useTheme()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><AuthLayout><LoginPage /></AuthLayout></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><AuthLayout><SignupPage /></AuthLayout></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><AuthLayout><ResetPasswordPage /></AuthLayout></PublicRoute>} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="portfolios" element={<PortfoliosPage />} />
            <Route path="portfolios/:portfolioId" element={<PortfolioDetailPage />} />
            <Route path="taxes" element={<TaxesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <div className="flex h-screen flex-col items-center justify-center bg-background">
              <h1 className="text-6xl font-bold text-foreground">404</h1>
              <p className="mt-4 text-muted-foreground">Pagina non trovata</p>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
