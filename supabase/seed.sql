-- Seed inicial - cria (ou redefine) o usuário administrador.
--
-- Como usar (dá para fazer pelo celular):
--   1. Troque e-mail, nome e senha nas 3 linhas abaixo (senha: 8+ caracteres).
--   2. Supabase > SQL Editor > New query > cole este arquivo > Run.
--
-- Se o e-mail já existir, a senha é redefinida e o perfil vira admin.
-- O hash é gerado pelo próprio banco (bcrypt via pgcrypto), então nenhuma
-- senha ou hash fica salvo no repositório. Não faça commit da sua senha.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_email text := 'admin@capacitacao.com';
  v_nome  text := 'Administrador';
  v_senha text := 'TROQUE_ESTA_SENHA';
BEGIN
  IF v_senha = 'TROQUE_ESTA_SENHA' OR length(v_senha) < 8 THEN
    RAISE EXCEPTION 'Defina uma senha com pelo menos 8 caracteres antes de rodar o seed';
  END IF;

  INSERT INTO public.users (email, password_hash, nome, role)
  VALUES (
    trim(v_email),
    extensions.crypt(v_senha, extensions.gen_salt('bf', 10)),
    v_nome,
    'admin'
  )
  ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role          = 'admin';

  RAISE NOTICE 'Administrador % pronto', v_email;
END $$;
