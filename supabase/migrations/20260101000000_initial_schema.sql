-- Sistema de Controle de Curso - Database Schema
-- Execute este script no SQL Editor do Supabase

-- Tabela de Usuários (Admins, Professores e Monitores)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'professor', 'monitor')),
  foto_url TEXT,
  data_nascimento DATE,
  nome_lider_direto TEXT,
  geracao TEXT,
  telefone_lider_direto TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Cursos
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ano INTEGER NOT NULL,
  descricao TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Módulos
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  numero_de_aulas INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, ordem)
);

-- Tabela de Aulas
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  data_aula DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, ordem)
);

-- Tabela de Turmas (Horários)
CREATE TABLE turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  dia_semana TEXT NOT NULL DEFAULT 'domingo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Relacionamento Turma-Professor (N-N)
CREATE TABLE turma_professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(turma_id, professor_id)
);

-- Tabela de Alunos
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  foto_url TEXT,
  data_nascimento DATE,
  nome_responsavel TEXT,
  telefone_responsavel TEXT,
  nome_lider_direto TEXT,
  geracao TEXT,
  telefone_lider_direto TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Presenças
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('presente', 'falta')),
  marked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- Índices para melhor performance
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_classes_module ON classes(module_id);
CREATE INDEX idx_turmas_course ON turmas(course_id);
CREATE INDEX idx_students_turma ON students(turma_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_turma_professors_turma ON turma_professors(turma_id);
CREATE INDEX idx_turma_professors_professor ON turma_professors(professor_id);

-- Comentários
COMMENT ON TABLE users IS 'Usuários do sistema (administradores e professores)';
COMMENT ON TABLE courses IS 'Cursos oferecidos (ex: Capacitação Destino 2026)';
COMMENT ON TABLE modules IS 'Módulos de cada curso';
COMMENT ON TABLE classes IS 'Aulas de cada módulo';
COMMENT ON TABLE turmas IS 'Turmas/Horários das aulas';
COMMENT ON TABLE students IS 'Alunos matriculados';
COMMENT ON TABLE attendance IS 'Registro de presença dos alunos';
