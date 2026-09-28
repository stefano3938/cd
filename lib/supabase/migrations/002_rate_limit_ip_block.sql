-- Rate limit de requisições e bloqueio automático de IPs abusivos.
-- Execute no SQL Editor do Supabase depois da 001_enable_rls.sql.
--
-- Os contadores ficam no banco porque na Vercel cada instância tem memória própria.
-- As chaves são guardadas como hash SHA-256 (minimização de dados — não armazena IP/e-mail em claro).

CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash     TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IP em claro é necessário aqui para o admin conseguir identificar e desbloquear.
-- Registros são apagados 30 dias após o fim do bloqueio (ver cleanup em api_guard).
CREATE TABLE IF NOT EXISTS ip_blocks (
  ip            TEXT PRIMARY KEY,
  blocked_until TIMESTAMPTZ NOT NULL,
  reason        TEXT,
  block_count   INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_ip_blocks_until ON ip_blocks(blocked_until);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blocks   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits, ip_blocks FROM anon, authenticated;

-- Incrementa o contador da chave de forma atômica (janela fixa)
CREATE OR REPLACE FUNCTION rate_limit_hit(p_key TEXT, p_limit INT, p_window_seconds INT)
RETURNS TABLE (allowed BOOLEAN, retry_after INT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hash  TEXT := encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  v_count INT;
  v_start TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits AS r (key_hash, count, window_start)
  VALUES (v_hash, 1, NOW())
  ON CONFLICT (key_hash) DO UPDATE SET
    count = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.count + 1 END,
    window_start = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds) THEN NOW() ELSE r.window_start END
  RETURNING r.count, r.window_start INTO v_count, v_start;

  RETURN QUERY SELECT
    v_count <= p_limit,
    GREATEST(CEIL(EXTRACT(EPOCH FROM (v_start + make_interval(secs => p_window_seconds) - NOW())))::INT, 1);
END $$;

CREATE OR REPLACE FUNCTION rate_limit_reset(p_key TEXT)
RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM rate_limits WHERE key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
$$;

-- Registra um "strike" para o IP. Ao atingir p_max_strikes dentro da janela, bloqueia o IP.
-- A duração do bloqueio dobra a cada reincidência (limitada a 24h).
CREATE OR REPLACE FUNCTION ip_register_strike(
  p_ip TEXT,
  p_reason TEXT,
  p_max_strikes INT DEFAULT 10,
  p_window_seconds INT DEFAULT 900,
  p_block_seconds INT DEFAULT 900
)
RETURNS INT -- segundos de bloqueio aplicados (0 = não bloqueou)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN;
  v_count   INT;
  v_seconds INT;
BEGIN
  SELECT allowed INTO v_allowed FROM rate_limit_hit('strike:' || p_ip, p_max_strikes, p_window_seconds);
  IF v_allowed THEN
    RETURN 0;
  END IF;

  SELECT block_count INTO v_count FROM ip_blocks WHERE ip = p_ip;
  v_seconds := LEAST(p_block_seconds * POWER(2, LEAST(COALESCE(v_count, 0), 10))::INT, 86400);

  INSERT INTO ip_blocks (ip, blocked_until, reason, block_count)
  VALUES (p_ip, NOW() + make_interval(secs => v_seconds), p_reason, 1)
  ON CONFLICT (ip) DO UPDATE SET
    blocked_until = EXCLUDED.blocked_until,
    reason = EXCLUDED.reason,
    block_count = ip_blocks.block_count + 1,
    updated_at = NOW();

  PERFORM rate_limit_reset('strike:' || p_ip);
  RETURN v_seconds;
END $$;

-- Chamada única por requisição (middleware): verifica bloqueio de IP e aplica o rate limit.
-- status: 'ok' | 'rate_limited' | 'blocked'
CREATE OR REPLACE FUNCTION api_guard(p_ip TEXT, p_bucket TEXT, p_limit INT, p_window_seconds INT)
RETURNS TABLE (status TEXT, retry_after INT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_until   TIMESTAMPTZ;
  v_allowed BOOLEAN;
  v_retry   INT;
  v_blocked INT;
BEGIN
  -- Limpeza oportunista (~1% das chamadas) para as tabelas não crescerem indefinidamente
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
    DELETE FROM ip_blocks WHERE blocked_until < NOW() - INTERVAL '30 days';
  END IF;

  SELECT blocked_until INTO v_until FROM ip_blocks WHERE ip = p_ip AND blocked_until > NOW();
  IF v_until IS NOT NULL THEN
    RETURN QUERY SELECT 'blocked'::TEXT, CEIL(EXTRACT(EPOCH FROM (v_until - NOW())))::INT;
    RETURN;
  END IF;

  SELECT h.allowed, h.retry_after INTO v_allowed, v_retry
  FROM rate_limit_hit(p_bucket || ':' || p_ip, p_limit, p_window_seconds) h;

  IF v_allowed THEN
    RETURN QUERY SELECT 'ok'::TEXT, 0;
    RETURN;
  END IF;

  -- Estourar o limite conta como strike; strikes acumulados bloqueiam o IP
  v_blocked := ip_register_strike(p_ip, 'rate_limit:' || p_bucket);
  IF v_blocked > 0 THEN
    RETURN QUERY SELECT 'blocked'::TEXT, v_blocked;
  ELSE
    RETURN QUERY SELECT 'rate_limited'::TEXT, v_retry;
  END IF;
END $$;

-- Somente o backend (service role) executa estas funções
REVOKE EXECUTE ON FUNCTION rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION rate_limit_reset(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION ip_register_strike(TEXT, TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION api_guard(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rate_limit_hit(TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION rate_limit_reset(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION ip_register_strike(TEXT, TEXT, INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION api_guard(TEXT, TEXT, INT, INT) TO service_role;
