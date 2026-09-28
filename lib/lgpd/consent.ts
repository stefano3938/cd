import { isMenor, PRIVACY_POLICY_VERSION } from './config'

export type ConsentTitular = 'aluno' | 'responsavel'

interface ConsentInput {
  consentimento_titular?: unknown
  consentimento_confirmado?: unknown
  data_nascimento?: string | null
  nome_responsavel?: string | null
}

interface ConsentFields {
  consentimento_em: string
  consentimento_versao: string
  consentimento_titular: ConsentTitular
  consentimento_registrado_por: string
}

type ConsentResult = { error: string; fields: null } | { error: null; fields: ConsentFields }

const fail = (error: string): ConsentResult => ({ error, fields: null })

// Valida o consentimento informado pelo admin (coletado no papel/presencialmente ou pelo formulário).
// Menor de idade: consentimento do responsável (LGPD art. 14).
export function buildConsent(input: ConsentInput, registradoPor: string): ConsentResult {
  if (input.consentimento_confirmado !== true) {
    return fail('Confirme que o consentimento foi obtido')
  }

  const titular = input.consentimento_titular
  if (titular !== 'aluno' && titular !== 'responsavel') {
    return fail('Informe quem deu o consentimento (aluno ou responsável)')
  }

  if (isMenor(input.data_nascimento) && titular !== 'responsavel') {
    return fail('Aluno menor de idade: o consentimento deve ser do responsável')
  }

  if (titular === 'responsavel' && !input.nome_responsavel) {
    return fail('Informe o nome do responsável')
  }

  return {
    error: null,
    fields: {
      consentimento_em: new Date().toISOString(),
      consentimento_versao: PRIVACY_POLICY_VERSION,
      consentimento_titular: titular,
      consentimento_registrado_por: registradoPor,
    },
  }
}
