-- LGPD: trilha de auditoria, registro de consentimento, anonimização e revogação de sessões.
-- Execute no SQL Editor do Supabase depois da 002. OBRIGATÓRIA antes do deploy desta versão
-- (as rotas passam a consultar users.session_version a cada requisição).

-- ─── Revogação de sessão ─────────────────────────────────────────────
-- Incrementar session_version invalida todas as sessões do usuário (troca de senha, mudança de perfil).
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

-- ─── Trilha de auditoria (art. 37) ───────────────────────────────────
-- Não guarde dados pessoais em "details": apenas IDs, nomes de campos e contagens.
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action     TEXT NOT NULL,   -- create | update | delete | view | export | anonymize | consent | login | login_failed | password_change | unblock_ip
  entity     TEXT NOT NULL,   -- student | user | attendance | turma | auth | ip_block
  entity_id  TEXT,
  details    JSONB,
  ip         TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_log FROM anon, authenticated;

-- Retenção da auditoria: [Decisão do controlador]. Uso: SELECT purge_audit_log(24);
CREATE OR REPLACE FUNCTION purge_audit_log(p_meses INT)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  DELETE FROM audit_log WHERE created_at < NOW() - make_interval(months => p_meses);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- ─── Consentimento (arts. 8º, 11 e 14) ───────────────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS consentimento_em TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consentimento_versao TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consentimento_titular TEXT
  CHECK (consentimento_titular IN ('aluno', 'responsavel'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS consentimento_registrado_por UUID
  REFERENCES users(id) ON DELETE SET NULL;

-- ─── Anonimização (retenção, art. 16) ────────────────────────────────
-- Mantém presenças (estatística) e remove tudo que identifica o aluno e terceiros.
ALTER TABLE students ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION anonimizar_turma(p_turma_id UUID)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  UPDATE students SET
    nome = 'Aluno anonimizado',
    email = NULL,
    telefone = NULL,
    foto_url = NULL,
    data_nascimento = NULL,
    nome_responsavel = NULL,
    telefone_responsavel = NULL,
    nome_lider_direto = NULL,
    geracao = NULL,
    telefone_lider_direto = NULL,
    anonimizado_em = NOW()
  WHERE turma_id = p_turma_id
    AND anonimizado_em IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE EXECUTE ON FUNCTION purge_audit_log(INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION anonimizar_turma(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION purge_audit_log(INT) TO service_role;
GRANT EXECUTE ON FUNCTION anonimizar_turma(UUID) TO service_role;
