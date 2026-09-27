import { createClient } from '@supabase/supabase-js'

// Cliente Supabase usado SOMENTE no servidor (rotas de API).
// Nunca importe este arquivo em componentes 'use client'.
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Transição: enquanto SUPABASE_SERVICE_ROLE_KEY não estiver configurada, usa a
// anon key. Depois de ativar o RLS (docs/BANCO_DE_DADOS.md) a service role é obrigatória.
const supabaseKey = serviceRoleKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja .env.example)')
}

if (!serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY não configurada; usando a anon key.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})
