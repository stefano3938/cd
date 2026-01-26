// Tipos do Banco de Dados

export type UserRole = 'admin' | 'professor'

export interface User {
  id: string
  email: string
  nome: string
  telefone?: string
  role: UserRole
  created_at: string
}

export interface Course {
  id: string
  nome: string
  ano: number
  descricao?: string
  created_by: string
  created_at: string
}

export interface Module {
  id: string
  course_id: string
  nome: string
  ordem: number
  numero_de_aulas: number
  created_at: string
}

export interface Class {
  id: string
  module_id: string
  titulo: string
  ordem: number
  data_aula?: string
  created_at: string
}

export interface Turma {
  id: string
  course_id: string
  nome: string
  horario_inicio: string
  horario_fim: string
  dia_semana: string
  created_at: string
}

export interface TurmaProfessor {
  id: string
  turma_id: string
  professor_id: string
  created_at: string
}

export interface Student {
  id: string
  nome: string
  email?: string
  telefone?: string
  turma_id: string
  created_at: string
}

export type AttendanceStatus = 'presente' | 'falta'

export interface Attendance {
  id: string
  student_id: string
  class_id: string
  status: AttendanceStatus
  marked_by: string
  marked_at: string
}
