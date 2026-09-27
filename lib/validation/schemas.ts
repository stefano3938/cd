import { z } from 'zod'

// ---------- Campos reutilizáveis ----------

export const uuid = z.uuid({ error: 'Identificador inválido' })

const requiredText = (max = 200) =>
  z.string({ error: 'Campo obrigatório' }).trim().min(1, { error: 'Campo obrigatório' }).max(max)

// Texto opcional: '' e ausente viram null
const optionalText = (max = 200) =>
  z.string().trim().max(max).nullish().transform(v => v || null)

const optionalEmail = z
  .union([z.literal(''), z.email({ error: 'E-mail inválido' })])
  .nullish()
  .transform(v => v || null)

const optionalDate = z
  .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data inválida' })])
  .nullish()
  .transform(v => v || null)

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { error: 'Horário inválido' })

const order = z.coerce.number({ error: 'Número inválido' }).int().min(1).max(1000)

export const roleSchema = z.enum(['admin', 'professor', 'monitor'], { error: 'Perfil inválido' })

export const password = z
  .string({ error: 'Senha obrigatória' })
  .min(8, { error: 'A senha deve ter pelo menos 8 caracteres' })
  .max(200)

export const idParams = z.object({ id: uuid })

// ---------- Autenticação ----------

const loginRequired = { error: 'Email e senha são obrigatórios' }
export const loginSchema = z.object({
  email: z.string(loginRequired).trim().min(1, loginRequired).max(200),
  password: z.string(loginRequired).min(1, loginRequired).max(200)
})

// ---------- Usuários ----------

const userFields = {
  nome: requiredText(),
  email: z.email({ error: 'E-mail inválido' }).trim().max(200),
  role: roleSchema,
  telefone: optionalText(30),
  foto_url: optionalText(500),
  data_nascimento: optionalDate,
  nome_lider_direto: optionalText(),
  geracao: optionalText(),
  telefone_lider_direto: optionalText(30)
}

export const createUserSchema = z.object({ ...userFields, password })
export const updateUserSchema = z.object({ ...userFields, password: password.optional() }).partial()

export const createProfessorSchema = z.object({
  nome: requiredText(),
  email: z.email({ error: 'E-mail inválido' }).trim().max(200),
  telefone: optionalText(30),
  senha: password
})
export const updateProfessorSchema = createProfessorSchema
  .extend({ senha: z.union([z.literal(''), password]).optional() })
  .partial()

// ---------- Cursos, módulos e aulas ----------

export const createCourseSchema = z.object({
  nome: requiredText(),
  ano: z.coerce.number({ error: 'Ano inválido' }).int().min(2000, { error: 'Ano inválido' }).max(2100, { error: 'Ano inválido' }),
  descricao: optionalText(2000)
})
export const updateCourseSchema = createCourseSchema.partial()

export const createModuleSchema = z.object({
  course_id: uuid,
  nome: requiredText(),
  ordem: order,
  numero_de_aulas: z.coerce.number({ error: 'Número inválido' }).int().min(1).max(100).default(4)
})
export const updateModuleSchema = createModuleSchema.omit({ course_id: true }).partial()

export const createClassSchema = z.object({
  module_id: uuid,
  titulo: requiredText(),
  ordem: order,
  data_aula: optionalDate
})
export const updateClassSchema = createClassSchema.omit({ module_id: true }).partial()

// ---------- Turmas ----------

const turmaFields = {
  course_id: uuid,
  nome: requiredText(),
  horario_inicio: time,
  horario_fim: time,
  dia_semana: z.string().trim().min(1).max(20).default('domingo'),
  professor_ids: z.array(uuid).max(50).optional()
}

export const createTurmaSchema = z.object(turmaFields)
export const updateTurmaSchema = z
  .object(turmaFields)
  .omit({ course_id: true })
  .partial()
  .extend({ dia_semana: z.string().trim().min(1).max(20).optional() })

// ---------- Alunos ----------

export const createStudentSchema = z.object({
  nome: requiredText(),
  email: optionalEmail,
  telefone: optionalText(30),
  turma_id: uuid,
  data_nascimento: optionalDate,
  nome_responsavel: optionalText(),
  telefone_responsavel: optionalText(30),
  nome_lider_direto: optionalText(),
  geracao: optionalText(),
  telefone_lider_direto: optionalText(30),
  foto_url: optionalText(500)
})
export const updateStudentSchema = createStudentSchema.partial()

export const importStudentsSchema = z.object({
  turma_id: uuid,
  students: z
    .array(
      z.object({
        nome: z.string().trim().max(200).optional().default(''),
        email: z.string().trim().max(200).optional(),
        telefone: z.string().trim().max(30).optional()
      })
    )
    .min(1, { error: 'Lista de alunos vazia' })
    .max(1000, { error: 'Importe no máximo 1000 alunos por vez' })
})

// ---------- Presença ----------

export const saveAttendanceSchema = z.object({
  class_id: uuid,
  attendance: z
    .array(
      z.object({
        student_id: uuid,
        status: z.enum(['presente', 'falta'], { error: 'Status deve ser presente ou falta' })
      })
    )
    .max(1000)
})
