// Cria (ou redefine a senha de) um usuário administrador.
// Uso: node --env-file=.env.local scripts/create-admin.mjs
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Configure SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const rl = createInterface({ input: stdin, output: stdout })
const email = (await rl.question('E-mail do admin: ')).trim()
const nome = (await rl.question('Nome: ')).trim() || 'Administrador'
const password = await rl.question('Senha (mínimo 12 caracteres): ')
rl.close()

if (!email || password.length < 12) {
  console.error('E-mail obrigatório e senha com pelo menos 12 caracteres.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const password_hash = await bcrypt.hash(password, 12)

const { error } = await supabase
  .from('users')
  .upsert({ email, nome, role: 'admin', password_hash }, { onConflict: 'email' })

if (error) {
  console.error('Erro ao criar admin:', error.message)
  process.exit(1)
}

console.log(`Admin ${email} criado/atualizado com sucesso.`)
