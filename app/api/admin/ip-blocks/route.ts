import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

// IPs bloqueados no momento
export async function GET() {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { data, error } = await supabase
    .from('ip_blocks')
    .select('ip, reason, block_count, blocked_until, updated_at')
    .gt('blocked_until', new Date().toISOString())
    .order('blocked_until', { ascending: false })

  if (error) return serverError('ip_blocks.list', error)
  return NextResponse.json(data)
}

// Desbloqueia um IP: DELETE /api/admin/ip-blocks?ip=203.0.113.10
export async function DELETE(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const ip = request.nextUrl.searchParams.get('ip')
  if (!ip) return NextResponse.json({ error: 'Informe o IP' }, { status: 400 })

  // Encerra o bloqueio atual mas mantém o histórico (block_count) para a escalada continuar valendo
  const { error } = await supabase
    .from('ip_blocks')
    .update({ blocked_until: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('ip', ip)

  if (error) return serverError('ip_blocks.unblock', error)
  await audit(request, session, { action: 'unblock_ip', entity: 'ip_block', entityId: ip })
  return NextResponse.json({ success: true })
}
