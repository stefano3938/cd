'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  nome: string
  email: string
  role: 'admin' | 'professor' | 'monitor'
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isProfessor: boolean
  isMonitor: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email, role')
        .eq('auth_id', userId)
        .single()

      if (error) {
        console.error('Erro ao carregar perfil:', error)
        // Tenta buscar por email como fallback
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user?.email) {
          const { data: profileByEmail } = await supabase
            .from('users')
            .select('id, nome, email, role')
            .eq('email', userData.user.email)
            .single()

          if (profileByEmail) {
            setProfile(profileByEmail as UserProfile)
          }
        }
      } else if (data) {
        setProfile(data as UserProfile)
      }
    } catch (e) {
      console.error('Erro ao carregar perfil:', e)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (e) {
      return { error: 'Erro ao fazer login' }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin',
    isProfessor: profile?.role === 'professor',
    isMonitor: profile?.role === 'monitor'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
