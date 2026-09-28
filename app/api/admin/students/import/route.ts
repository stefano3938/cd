import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

interface StudentData {
  nome: string
  email?: string
  telefone?: string
}

const MAX_IMPORT = 1000

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { students, turma_id } = body as { students: StudentData[]; turma_id: string }

  if (!students || !Array.isArray(students) || students.length === 0) {
    return NextResponse.json({ error: 'Lista de alunos vazia' }, { status: 400 })
  }

  if (students.length > MAX_IMPORT) {
    return NextResponse.json({ error: `Máximo de ${MAX_IMPORT} alunos por importação` }, { status: 400 })
  }

  if (!turma_id) {
    return NextResponse.json({ error: 'turma_id obrigatório' }, { status: 400 })
  }

  // Validar dados
  const validStudents = students.filter(s => typeof s?.nome === 'string' && s.nome.trim().length > 0)

  if (validStudents.length === 0) {
    return NextResponse.json({ error: 'Nenhum aluno válido na lista' }, { status: 400 })
  }

  // Preparar dados para inserção
  const records = validStudents.map(s => ({
    nome: s.nome.trim(),
    email: s.email?.trim() || null,
    telefone: s.telefone?.trim() || null,
    turma_id
  }))

  const { data, error } = await supabase
    .from('students')
    .insert(records)
    .select()

  if (error) return serverError('students.import', error)

  await audit(request, session, {
    action: 'create',
    entity: 'student',
    details: { importacao: true, turma_id, total: data?.length ?? 0 }
  })

  return NextResponse.json({
    success: true,
    imported: data?.length || 0,
    total: students.length
  })
}
