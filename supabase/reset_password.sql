-- Redefine a senha de um usuário existente (admin, professor ou monitor).
-- Use para os usuários criados antes da correção, cuja senha foi salva em
-- Base64 e por isso não conseguem mais logar.
--
-- 1) Descubra quem precisa de nova senha (hash que não é bcrypt):
--
--    SELECT email, nome, role FROM public.users WHERE password_hash NOT LIKE '$2%';
--
-- 2) Troque e-mail e senha abaixo e rode no SQL Editor do Supabase.
--    Informe a nova senha à pessoa por um canal privado.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_email text := 'usuario@exemplo.com';
  v_senha text := 'TROQUE_ESTA_SENHA';
  v_linhas int;
BEGIN
  IF v_senha = 'TROQUE_ESTA_SENHA' OR length(v_senha) < 8 THEN
    RAISE EXCEPTION 'Defina uma senha com pelo menos 8 caracteres';
  END IF;

  UPDATE public.users
     SET password_hash = extensions.crypt(v_senha, extensions.gen_salt('bf', 10))
   WHERE email = trim(v_email);

  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  IF v_linhas = 0 THEN
    RAISE EXCEPTION 'Nenhum usuário com o e-mail %', v_email;
  END IF;

  RAISE NOTICE 'Senha de % redefinida', v_email;
END $$;
