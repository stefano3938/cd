-- Operações de turma em transação única (evita turma sem professores se algo falhar no meio).
-- Execute no SQL Editor do Supabase depois da 003.

-- Substitui os professores da turma. Ignora IDs que não sejam de usuários com perfil 'professor'.
CREATE OR REPLACE FUNCTION definir_professores_turma(p_turma_id UUID, p_professor_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  DELETE FROM turma_professors WHERE turma_id = p_turma_id;

  INSERT INTO turma_professors (turma_id, professor_id)
  SELECT p_turma_id, u.id
  FROM users u
  WHERE u.id = ANY(COALESCE(p_professor_ids, '{}'))
    AND u.role = 'professor';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- Cria a turma e vincula os professores numa única transação
CREATE OR REPLACE FUNCTION criar_turma(
  p_course_id UUID,
  p_nome TEXT,
  p_horario_inicio TIME,
  p_horario_fim TIME,
  p_dia_semana TEXT,
  p_professor_ids UUID[]
)
RETURNS turmas
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_turma turmas;
BEGIN
  INSERT INTO turmas (course_id, nome, horario_inicio, horario_fim, dia_semana)
  VALUES (p_course_id, p_nome, p_horario_inicio, p_horario_fim, COALESCE(p_dia_semana, 'domingo'))
  RETURNING * INTO v_turma;

  PERFORM definir_professores_turma(v_turma.id, p_professor_ids);
  RETURN v_turma;
END $$;

REVOKE EXECUTE ON FUNCTION definir_professores_turma(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION criar_turma(UUID, TEXT, TIME, TIME, TEXT, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION definir_professores_turma(UUID, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION criar_turma(UUID, TEXT, TIME, TIME, TEXT, UUID[]) TO service_role;
