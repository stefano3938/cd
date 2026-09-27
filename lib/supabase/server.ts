import { createClient } from '@supabase/supabase-js'

// Cliente Supabase usado SOMENTE no servidor (rotas de API).
// Nunca importe este arquivo em componentes 'use client'.
//
// Usa a service role key, que ignora o RLS. Com o RLS ativo
// (supabase/migrations/*_enable_rls.sql) a anon key não enxerga nenhum dado.
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja .env.example)')
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})
