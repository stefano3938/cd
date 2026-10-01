-- Impede que exclusões apaguem histórico de chamadas e alunos "em cascata".
-- Execute no SQL Editor do Supabase depois da 005 (ou da 004, se a 005 ainda não foi rodada).
-- Pode ser executada mais de uma vez.
--
-- Antes:
--   excluir usuário  → apagava TODAS as chamadas que ele marcou (attendance.marked_by CASCADE)
--   excluir turma    → apagava todos os alunos e presenças da turma
--   excluir curso    → apagava turmas, alunos, aulas e presenças
--   excluir aula     → apagava as presenças daquela aula
-- Depois:
--   excluir usuário  → as chamadas ficam; "marcado por" fica vazio (a auditoria guarda quem foi)
--   turma com alunos, curso com turmas, aula/módulo com presenças → o banco recusa a exclusão
--   excluir aluno    → continua apagando as presenças dele (pedido de exclusão do titular)

-- Troca a regra ON DELETE de uma chave estrangeira, qualquer que seja o nome da constraint
CREATE OR REPLACE FUNCTION pg_temp.trocar_fk(
  p_tabela TEXT, p_coluna TEXT, p_ref_tabela TEXT, p_regra TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.contype = 'f'
      AND con.conrelid = format('public.%I', p_tabela)::regclass
      AND att.attname = p_coluna
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_tabela, c.conname);
  END LOOP;

  EXECUTE format(
    'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s',
    p_tabela, p_tabela || '_' || p_coluna || '_fkey', p_coluna, p_ref_tabela, p_regra
  );
END $$;

BEGIN;

-- Chamadas sobrevivem à exclusão de quem as marcou
ALTER TABLE attendance ALTER COLUMN marked_by DROP NOT NULL;
SELECT pg_temp.trocar_fk('attendance', 'marked_by', 'users', 'SET NULL');

-- Não apagar alunos/turmas/presenças por tabela
SELECT pg_temp.trocar_fk('students',   'turma_id',  'turmas',  'RESTRICT');
SELECT pg_temp.trocar_fk('turmas',     'course_id', 'courses', 'RESTRICT');
SELECT pg_temp.trocar_fk('attendance', 'class_id',  'classes', 'RESTRICT');

COMMIT;

-- Exclusão de usuário usada pela API. Existe para a API saber que esta migração foi aplicada:
-- sem ela, excluir um usuário ainda apagaria as chamadas dele, então a API recusa a exclusão.
CREATE OR REPLACE FUNCTION excluir_usuario(p_user_id UUID, p_role TEXT DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  DELETE FROM users
  WHERE id = p_user_id
    AND (p_role IS NULL OR role = p_role);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE EXECUTE ON FUNCTION excluir_usuario(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION excluir_usuario(UUID, TEXT) TO service_role;

-- Conferência (deve mostrar SET NULL para marked_by e RESTRICT para os outros três):
-- SELECT conrelid::regclass AS tabela, conname,
--        CASE confdeltype WHEN 'n' THEN 'SET NULL' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' ELSE confdeltype::text END AS ao_excluir
-- FROM pg_constraint
-- WHERE conname IN ('attendance_marked_by_fkey','students_turma_id_fkey','turmas_course_id_fkey','attendance_class_id_fkey');
