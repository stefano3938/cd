-- Registro de tentativas de login, usado para limitar tentativas por
-- e-mail e por IP (lib/auth/rate-limit.ts). Só o servidor acessa.

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id          BIGSERIAL PRIMARY KEY,
  ip          TEXT NOT NULL,
  email       TEXT NOT NULL,
  success     BOOLEAN NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created    ON public.login_attempts (ip, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON public.login_attempts (email, created_at);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.login_attempts_id_seq FROM anon, authenticated;

COMMENT ON TABLE public.login_attempts IS 'Tentativas de login (rate limit); registros com mais de 1 dia são apagados automaticamente';
