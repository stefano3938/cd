import { supabase } from '@/lib/supabase/client'

export type AttendanceInput = { student_id: string; status: 'presente' | 'falta' }

const VALID_STATUS = ['presente', 'falta']

// Retorna a lista validada ou null se algum registro for inválido
export function parseAttendance(input: unknown): AttendanceInput[] | null {
  if (!Array.isArray(input) || input.length === 0) return null

  const records: AttendanceInput[] = []
  for (const item of input) {
    if (typeof item?.student_id !== 'string' || !VALID_STATUS.includes(item?.status)) {
      return null
    }
    records.push({ student_id: item.student_id, status: item.status })
  }
  return records
}

// A aula precisa pertencer ao curso da turma
export async function classBelongsToTurma(classId: string, turmaId: string) {
  const { data: turma } = await supabase
    .from('turmas')
    .select('course_id')
    .eq('id', turmaId)
    .maybeSingle()
  if (!turma) return false

  const { data: cls } = await supabase
    .from('classes')
    .select('id, modules!inner(course_id)')
    .eq('id', classId)
    .eq('modules.course_id', turma.course_id)
    .maybeSingle()

  return !!cls
}

// Todos os alunos informados precisam estar matriculados na turma
export async function studentsBelongToTurma(studentIds: string[], turmaId: string) {
  const unique = Array.from(new Set(studentIds))
  const { count } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('turma_id', turmaId)
    .in('id', unique)

  return count === unique.length
}
