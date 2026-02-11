import { create } from 'zustand'
import { supabase, getCurrentUser, getSession } from '@/lib/supabase'

interface AuthState {
  user: any | null
  session: any | null
  isLoading: boolean
  isAuthenticated: boolean
  
  setUser: (user: any | null) => void
  setSession: (session: any | null) => void
  initialize: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  
  setUser: (user) => set({ 
    user, 
    isAuthenticated: user !== null 
  }),
  
  setSession: (session) => set({ session }),
  
  initialize: async () => {
    try {
      set({ isLoading: true })
      
      const session = await getSession()
      const user = await getCurrentUser()
      
      if (user && session) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        set({
          user: {
            id: user.id,
            email: user.email!,
            profile,
          },
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token!,
            expires_at: new Date(session.expires_at!).getTime(),
            user: {
              id: user.id,
              email: user.email!,
              profile,
            },
          },
          isAuthenticated: true,
        })
      } else {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        })
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      })
    } finally {
      set({ isLoading: false })
    }
  },
  
  logout: async () => {
    try {
      await supabase.auth.signOut()
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      })
    } catch (error) {
      console.error('Error logging out:', error)
    }
  },
}))

// Setup auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useAuthStore.getState()
  
  if (event === 'SIGNED_IN' && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    store.setUser({
      id: session.user.id,
      email: session.user.email!,
      profile,
    })
    
    store.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: new Date(session.expires_at!).getTime(),
      user: {
        id: session.user.id,
        email: session.user.email!,
        profile,
      },
    })
  } else if (event === 'SIGNED_OUT') {
    store.setUser(null)
    store.setSession(null)
  }
})