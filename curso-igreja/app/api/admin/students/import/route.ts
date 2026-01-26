import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

interface StudentData {
  nome: string
  email?: string
  telefone?: string
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { students, turma_id } = body as { students: StudentData[]; turma_id: string }

  if (!students || !Array.isArray(students) || students.length === 0) {
    return NextResponse.json({ error: 'Lista de alunos vazia' }, { status: 400 })
  }

  if (!turma_id) {
    return NextResponse.json({ error: 'turma_id obrigatório' }, { status: 400 })
  }

  // Validar dados
  const validStudents = students.filter(s => s.nome && s.nome.trim().length > 0)

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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    imported: data?.length || 0,
    total: students.length
  })
}
