import type { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import type { Session } from '@/lib/auth/session'
import { getClientIp } from './rate-limit'

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'view' | 'export' | 'anonymize' | 'consent'
  | 'login' | 'login_failed' | 'password_change' | 'unblock_ip'

export type AuditEntity = 'student' | 'user' | 'attendance' | 'turma' | 'auth' | 'ip_block'

interface AuditEntry {
  action: AuditAction
  entity: AuditEntity
  entityId?: string | null
  // Somente IDs, nomes de campos e contagens — nunca valores de dados pessoais
  details?: Record<string, unknown>
}

// Falha na auditoria não interrompe a operação, mas é registrada no log do servidor
export async function audit(request: NextRequest | null, session: Session | null, entry: AuditEntry) {
  const { error } = await supabase.from('audit_log').insert({
    actor_id: session?.sub ?? null,
    actor_role: session?.role ?? null,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    details: entry.details ?? null,
    ip: request ? getClientIp(request) : null,
  })
  if (error) console.error('[audit]', error.code, error.message)
}
