// Colunas seguras para devolver ao cliente (nunca incluir password_hash)
export const USER_PUBLIC_COLUMNS =
  'id, email, nome, telefone, role, foto_url, data_nascimento, nome_lider_direto, geracao, telefone_lider_direto, created_at'

export const VALID_ROLES = ['admin', 'professor', 'monitor']
