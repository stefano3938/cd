import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'
import { CONTROLLER } from '@/lib/lgpd/config'

// Portabilidade / acesso (LGPD art. 18, II e V): todos os dados do aluno em formato estruturado
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { data: student, error } = await supabase
    .from('students')
    .select('*, turmas(nome, horario_inicio, horario_fim, dia_semana, courses(nome, ano))')
    .eq('id', id)
    .maybeSingle()

  if (error) return serverError('students.export', error)
  if (!student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('status, marked_at, classes(titulo, data_aula, modules(nome))')
    .eq('student_id', id)
    .order('marked_at')

  if (attError) return serverError('students.export', attError)

  // Remove campos internos que não são dados do titular
  const dados = { ...student }
  delete dados.consentimento_registrado_por
  delete dados.turma_id

  const payload = {
    gerado_em: new Date().toISOString(),
    controlador: { nome: CONTROLLER.nome, contato: CONTROLLER.contato },
    titular: dados,
    presencas: attendance ?? [],
  }

  await audit(request, session, { action: 'export', entity: 'student', entityId: id })

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="dados-aluno-${id}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
