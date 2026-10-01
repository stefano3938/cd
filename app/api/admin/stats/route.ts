import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

// Totais do dashboard. Só contagens (head: true) — nenhum dado pessoal sai do banco.
export async function GET() {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const [cursos, turmas, professores, alunos] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('turmas').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'professor'),
    supabase.from('students').select('id', { count: 'exact', head: true }),
  ])

  const error = cursos.error || turmas.error || professores.error || alunos.error
  if (error) return serverError('stats', error)

  return NextResponse.json({
    cursos: cursos.count ?? 0,
    turmas: turmas.count ?? 0,
    professores: professores.count ?? 0,
    alunos: alunos.count ?? 0,
  })
}
