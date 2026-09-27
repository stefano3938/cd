-- Ativa Row Level Security (RLS) em todas as tabelas.
--
-- A aplicação acessa o banco SOMENTE pelo servidor, com a service role key
-- (lib/supabase/server.ts), que ignora o RLS. Por isso nenhuma política é
-- criada: RLS ativo e sem políticas bloqueia totalmente as chaves públicas
-- (anon / authenticated), que antes davam acesso livre às tabelas pela
-- REST API do Supabase.
--
-- ATENÇÃO: aplique somente depois de configurar SUPABASE_SERVICE_ROLE_KEY na
-- aplicação. Com a anon key, as consultas passam a voltar vazias.
--
-- Pode ser executado mais de uma vez sem efeito colateral.

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_professors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance        ENABLE ROW LEVEL SECURITY;

-- Defesa extra: remove das chaves públicas qualquer permissão nas tabelas
-- existentes e nas que forem criadas no futuro.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
