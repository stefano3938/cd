-- Verificação: rode no SQL Editor do Supabase depois de aplicar o RLS.
-- Todas as linhas devem mostrar rls_ativo = true e anon_pode_ler = false.

SELECT
  c.relname                                         AS tabela,
  c.relrowsecurity                                  AS rls_ativo,
  has_table_privilege('anon', c.oid, 'SELECT')      AS anon_pode_ler,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
