// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// Client-side Supabase client con configurazioni di sicurezza
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage (secure per web apps)
    persistSession: true,
    
    // Auto refresh tokens prima della scadenza
    autoRefreshToken: true,
    
    // Detect session from URL (per magic links e OAuth)
    detectSessionInUrl: true,
    
    // Storage key personalizzato
    storageKey: 'wealth-tracker-auth',
    
    // Flow type per PKCE (più sicuro)
    flowType: 'pkce',
  },
  
  global: {
    headers: {
      'X-Client-Info': 'wealth-tracker-web',
    },
  },
  
  db: {
    schema: 'public',
  },
  
  // Realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper functions per auth

export const signUp = async (email: string, password: string, fullName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      // Email confirmation richiesta
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  if (error) throw error
  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
  
  if (error) throw error
  return data
}

export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  if (error) throw error
  return data
}

export const signInWithMagicLink = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  
  if (error) throw error
  return data
}

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  
  if (error) throw error
  return data
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) throw error
  return user
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) throw error
  return session
}

// Helper per verificare subscription tier
export const hasPermission = async (requiredTier: 'free' | 'premium' | 'professional') => {
  const user = await getCurrentUser()
  if (!user) return false
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('user_id', user.id)
    .single()
  
  if (!profile) return false
  
  const tierHierarchy = { free: 0, premium: 1, professional: 2 }
  return tierHierarchy[profile.subscription_tier] >= tierHierarchy[requiredTier]
}

// Error handler per Supabase errors
export const handleSupabaseError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: string }).message
    
    // Mapping errori comuni a messaggi user-friendly
    if (message.includes('Invalid login credentials')) {
      return 'Email o password non corretti'
    }
    if (message.includes('Email not confirmed')) {
      return 'Conferma la tua email prima di accedere'
    }
    if (message.includes('User already registered')) {
      return 'Questo indirizzo email è già registrato'
    }
    if (message.includes('Password should be at least')) {
      return 'La password deve essere di almeno 6 caratteri'
    }
    
    return message
  }
  
  return 'Si è verificato un errore imprevisto'
}

// Type guard per verificare se l'utente è autenticato
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession()
  return session !== null
}

// Listener per cambio di sessione (utile per logout automatico, refresh, etc.)
export const onAuthStateChange = (
  callback: (event: string, session: unknown) => void
) => {
  return supabase.auth.onAuthStateChange(callback)
}
