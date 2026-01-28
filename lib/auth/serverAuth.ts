import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignora erros quando chamado de Server Component
          }
        },
      },
    }
  )
}

export async function getServerSession() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getServerUser() {
  const session = await getServerSession()
  if (!session) return null

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .single()

  return profile
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    return { error: 'Não autenticado', status: 401 }
  }
  return { session, error: null }
}

export async function requireAdmin() {
  const user = await getServerUser()
  if (!user) {
    return { error: 'Não autenticado', status: 401 }
  }
  if (user.role !== 'admin') {
    return { error: 'Acesso negado', status: 403 }
  }
  return { user, error: null }
}

export async function requireAdminOrProfessor() {
  const user = await getServerUser()
  if (!user) {
    return { error: 'Não autenticado', status: 401 }
  }
  if (user.role !== 'admin' && user.role !== 'professor') {
    return { error: 'Acesso negado', status: 403 }
  }
  return { user, error: null }
}
