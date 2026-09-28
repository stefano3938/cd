import styles from '@/assets/css/privacidade.module.css'
import { CONTROLLER, PRIVACY_POLICY_VERSION } from '@/lib/lgpd/config'

export const metadata = {
  title: 'Aviso de Privacidade — Capacitação Destino',
}

// MODELO: revisar com o controlador (igreja) antes de publicar. Trechos entre [colchetes] são decisões pendentes.
export default function PrivacidadePage() {
  return (
    <main className={styles.container}>
      <article className={styles.content}>
        <h1>Aviso de Privacidade</h1>
        <p className={styles.meta}>Curso Capacitação Destino · Versão {PRIVACY_POLICY_VERSION}</p>
        <p>
          Este aviso explica como tratamos os dados de quem participa do curso. Os alunos não acessam o sistema:
          as informações são registradas pela coordenação e pelos professores a partir da ficha de matrícula.
        </p>

        <h2>1. Quem trata seus dados</h2>
        <p>
          {CONTROLLER.nome} (CNPJ {CONTROLLER.cnpj}) é a controladora dos dados pessoais tratados neste sistema.
          Dúvidas e pedidos sobre seus dados: <strong>{CONTROLLER.contato}</strong> ({CONTROLLER.encarregado}).
        </p>

        <h2>2. Quais dados coletamos</h2>
        <ul>
          <li><strong>Aluno:</strong> nome, data de nascimento, e-mail, telefone, turma e registros de presença.</li>
          <li><strong>Responsável</strong> (alunos menores de 18 anos): nome e telefone.</li>
          <li><strong>Líder direto:</strong> nome, telefone e geração.</li>
          <li><strong>Professores e administradores:</strong> nome, e-mail, telefone e dados de acesso.</li>
          <li><strong>Dados técnicos:</strong> endereço IP e registros de acesso, para segurança do sistema.</li>
        </ul>

        <h2>3. Para que usamos</h2>
        <ul>
          <li>Organizar matrículas, turmas e horários do curso.</li>
          <li>Registrar presença e acompanhar a frequência.</li>
          <li>Entrar em contato com o aluno, o responsável ou o líder sobre o curso.</li>
          <li>Proteger o sistema contra acessos indevidos.</li>
        </ul>
        <p>Não usamos seus dados para publicidade e não os vendemos.</p>

        <h2>4. Base legal</h2>
        <p>
          A participação em um curso da igreja pode revelar convicção religiosa, que a LGPD considera dado
          sensível. Por isso, tratamos os dados com base no seu <strong>consentimento específico</strong> (art. 11, I)
          ou, no caso de menores, no consentimento de um dos pais ou responsável legal (art. 14).
          Os registros de segurança (IP e acessos) são tratados para cumprir o dever de segurança (art. 46).
          [Revisar com o controlador]
        </p>

        <h2>5. Com quem compartilhamos</h2>
        <p>
          Os dados ficam acessíveis apenas aos administradores do curso e, no caso da chamada, ao professor da
          turma (somente o nome do aluno). Usamos fornecedores de tecnologia para hospedar o sistema e o banco
          de dados (Vercel e Supabase), que podem armazenar dados fora do Brasil, com garantias contratuais de
          proteção. [Confirmar região dos servidores]
        </p>

        <h2>6. Por quanto tempo guardamos</h2>
        <p>
          Os dados do aluno são mantidos enquanto durar o curso e por [PRAZO] após o seu encerramento.
          Depois disso, são anonimizados: mantemos apenas estatísticas de frequência, sem identificar ninguém.
          Registros de segurança são mantidos por até [PRAZO DA AUDITORIA].
        </p>

        <h2>7. Seus direitos</h2>
        <p>Você (ou o responsável, no caso de menores) pode, a qualquer momento, pedir:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos ou desatualizados;</li>
          <li>cópia dos seus dados em formato estruturado (portabilidade);</li>
          <li>eliminação dos dados e revogação do consentimento;</li>
          <li>informação sobre com quem compartilhamos seus dados.</li>
        </ul>
        <p>
          Envie o pedido para <strong>{CONTROLLER.contato}</strong> ou fale com a coordenação do curso. A coordenação
          confere sua identidade e responde, inclusive enviando a cópia dos seus dados quando solicitada.
          Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>

        <h2>8. Segurança</h2>
        <p>
          O acesso ao sistema exige login, cada perfil vê apenas o necessário, as senhas são armazenadas de forma
          criptografada e as ações sobre dados pessoais ficam registradas.
        </p>
      </article>
    </main>
  )
}
