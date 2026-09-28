-- Ativa Row Level Security em todas as tabelas e bloqueia acesso direto pelas chaves públicas.
-- Execute no SQL Editor do Supabase.
--
-- Sem nenhuma policy, os papéis "anon" e "authenticated" ficam sem acesso algum.
-- O backend (rotas /api) usa a SUPABASE_SERVICE_ROLE_KEY, que ignora RLS, então o sistema continua funcionando.

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE turma_professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance       ENABLE ROW LEVEL SECURITY;

-- Defesa extra: remove qualquer permissão concedida aos papéis públicos
REVOKE ALL ON users, courses, modules, classes, turmas, turma_professors, students, attendance FROM anon, authenticated;

-- Remove policies permissivas que possam ter sido criadas pelo painel
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','courses','modules','classes','turmas','turma_professors','students','attendance')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;
