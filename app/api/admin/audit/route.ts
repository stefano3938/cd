import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

const MAX_LIMIT = 500

// Consulta da trilha de auditoria (somente leitura)
export async function GET(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const params = request.nextUrl.searchParams
  const entity = params.get('entity')
  const entityId = params.get('entity_id')
  const action = params.get('action')
  const limit = Math.min(Number(params.get('limit')) || 200, MAX_LIMIT)

  let query = supabase
    .from('audit_log')
    .select('id, created_at, actor_id, actor_role, action, entity, entity_id, details, ip, users(nome)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entity) query = query.eq('entity', entity)
  if (entityId) query = query.eq('entity_id', entityId)
  if (action) query = query.eq('action', action)

  const { data, error } = await query
  if (error) return serverError('audit.list', error)
  return NextResponse.json(data)
}
