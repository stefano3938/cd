-- Ajustes de índices conforme as consultas das rotas.
-- Execute no SQL Editor do Supabase depois da 004. Pode ser executada mais de uma vez.

-- Lista de alunos da turma ordenada por nome (chamada, matrículas, consulta):
-- WHERE turma_id = ? ORDER BY nome. Substitui o índice só por turma_id.
CREATE INDEX IF NOT EXISTS idx_students_turma_nome ON students(turma_id, nome);
DROP INDEX IF EXISTS idx_students_turma;

-- Chaves estrangeiras sem índice: ao excluir um usuário, o Postgres precisa achar
-- as linhas que o referenciam (ON DELETE CASCADE / SET NULL) sem varrer a tabela inteira.
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_students_consentimento_por ON students(consentimento_registrado_por);

-- Índices redundantes: já cobertos pelas restrições UNIQUE, cuja primeira coluna é a mesma.
-- UNIQUE(student_id, class_id) atende buscas por student_id.
DROP INDEX IF EXISTS idx_attendance_student;
-- UNIQUE(turma_id, professor_id) atende buscas por turma_id.
DROP INDEX IF EXISTS idx_turma_professors_turma;
