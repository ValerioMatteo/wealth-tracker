import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase handles the callback automatically
    // Just redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      navigate('/dashboard')
    }, 1000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-600">Autenticazione in corso...</p>
      </div>
    </div>
  )
}
