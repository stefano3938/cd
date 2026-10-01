// Configuração de privacidade. Pode ser importado no cliente (sem segredos).
// [Decisão do controlador]: preencher dados reais da igreja antes de publicar.

import { parseDataLocal } from '@/lib/datas'

// Incrementar sempre que o texto do aviso de privacidade mudar (fica registrado em cada consentimento)
export const PRIVACY_POLICY_VERSION = '1.0'

export const CONTROLLER = {
  nome: '[NOME DA IGREJA]',
  cnpj: '[CNPJ]',
  contato: '[E-MAIL DE CONTATO PARA PRIVACIDADE]',
  encarregado: '[NOME DO ENCARREGADO OU "Secretaria da igreja"]',
}

export const MAIORIDADE = 18

export function calcularIdade(dataNascimento: string, hoje = new Date()) {
  // Sem parseDataLocal, no navegador (UTC−3) o aniversário caía um dia depois
  const nascimento = parseDataLocal(dataNascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--
  return idade
}

export function isMenor(dataNascimento?: string | null) {
  return !!dataNascimento && calcularIdade(dataNascimento) < MAIORIDADE
}
