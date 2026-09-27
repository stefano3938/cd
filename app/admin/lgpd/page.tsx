'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import styles from '@/assets/css/admin.module.css'

type Tab = 'auditoria' | 'ips' | 'anonimizacao'

interface AuditEntry {
  id: number
  created_at: string
  actor_role: string | null
  action: string
  entity: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip: string | null
  users: { nome: string } | null
}

interface IpBlock {
  ip: string
  reason: string | null
  block_count: number
  blocked_until: string
}

interface Turma {
  id: string
  nome: string
  horario_inicio: string
  courses?: { nome: string } | null
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Alteração',
  delete: 'Exclusão',
  view: 'Visualização',
  export: 'Exportação',
  anonymize: 'Anonimização',
  consent: 'Consentimento',
  login: 'Login',
  login_failed: 'Login com falha',
  password_change: 'Troca de senha',
  unblock_ip: 'Desbloqueio de IP',
}

const ENTITY_LABELS: Record<string, string> = {
  student: 'Aluno',
  user: 'Usuário',
  attendance: 'Chamada',
  turma: 'Turma',
  auth: 'Acesso',
  ip_block: 'IP',
}

export default function LgpdPage() {
  const [tab, setTab] = useState<Tab>('auditoria')

  return (
    <AdminLayout>
      <div className={styles.card}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'auditoria' ? styles.tabActive : ''}`} onClick={() => setTab('auditoria')}>
            Auditoria
          </button>
          <button className={`${styles.tab} ${tab === 'ips' ? styles.tabActive : ''}`} onClick={() => setTab('ips')}>
            IPs bloqueados
          </button>
          <button className={`${styles.tab} ${tab === 'anonimizacao' ? styles.tabActive : ''}`} onClick={() => setTab('anonimizacao')}>
            Anonimização
          </button>
        </div>

        {tab === 'auditoria' && <Auditoria />}
        {tab === 'ips' && <IpsBloqueados />}
        {tab === 'anonimizacao' && <Anonimizacao />}
      </div>
    </AdminLayout>
  )
}

function Auditoria() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const params = new URLSearchParams()
      if (entity) params.set('entity', entity)
      if (action) params.set('action', action)
      const res = await fetch(`/api/admin/audit?${params}`)
      setEntries(res.ok ? await res.json() : [])
      setLoading(false)
    }
    load()
  }, [entity, action])

  return (
    <>
      <div className={styles.formRow} style={{ marginBottom: '16px' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Tipo de registro</label>
          <select className={styles.select} value={entity} onChange={e => setEntity(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Ação</label>
          <select className={styles.select} value={action} onChange={e => setAction(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : entries.length === 0 ? (
        <div className={styles.empty}>Nenhum registro</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Quem</th>
                <th>Ação</th>
                <th>Registro</th>
                <th>Detalhes</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.created_at).toLocaleString('pt-BR')}</td>
                  <td>{e.users?.nome ?? (e.actor_role ? `(${e.actor_role})` : '—')}</td>
                  <td>{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td>
                    {ENTITY_LABELS[e.entity] ?? e.entity}
                    {e.entity_id && <div className={styles.mono}>{e.entity_id}</div>}
                  </td>
                  <td className={styles.mono}>{e.details ? JSON.stringify(e.details) : ''}</td>
                  <td className={styles.mono}>{e.ip ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.consentText} style={{ marginTop: '12px' }}>Exibindo os 200 registros mais recentes.</p>
    </>
  )
}

function IpsBloqueados() {
  const [blocks, setBlocks] = useState<IpBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/ip-blocks')
    setBlocks(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function unblock(ip: string) {
    setError('')
    const res = await fetch(`/api/admin/ip-blocks?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao desbloquear')
      return
    }
    load()
  }

  return (
    <>
      <p className={styles.consentText} style={{ marginBottom: '12px' }}>
        IPs são bloqueados automaticamente após muitas tentativas de login erradas ou excesso de requisições.
        O bloqueio dobra a cada reincidência (máx. 24h).
      </p>
      {error && <div className={styles.error}>{error}</div>}
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : blocks.length === 0 ? (
        <div className={styles.empty}>Nenhum IP bloqueado no momento</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>IP</th>
              <th>Motivo</th>
              <th>Bloqueios</th>
              <th>Bloqueado até</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(b => (
              <tr key={b.ip}>
                <td className={styles.mono}>{b.ip}</td>
                <td>{b.reason ?? '-'}</td>
                <td>{b.block_count}</td>
                <td>{new Date(b.blocked_until).toLocaleString('pt-BR')}</td>
                <td>
                  <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => unblock(b.ip)}>
                    Desbloquear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function Anonimizacao() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/admin/turmas')
      .then(r => (r.ok ? r.json() : []))
      .then(setTurmas)
  }, [])

  const turma = turmas.find(t => t.id === turmaId)

  async function anonimizar() {
    if (!turma) return
    setRunning(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/turmas/${turma.id}/anonymize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmacao })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao anonimizar')
        return
      }
      setSuccess(`${data.anonimizados} aluno(s) anonimizado(s) na turma "${turma.nome}".`)
      setConfirmacao('')
      setTurmaId('')
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <div className={styles.warningBox}>
        <strong>Ação irreversível.</strong> Remove nome, contatos, data de nascimento e dados do responsável e do
        líder de todos os alunos da turma. As presenças são mantidas apenas como estatística.
        Use quando a turma passar do prazo de retenção definido pela igreja (ver Aviso de Privacidade).
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.form} style={{ maxWidth: '480px' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Turma</label>
          <select className={styles.select} value={turmaId} onChange={e => { setTurmaId(e.target.value); setConfirmacao('') }}>
            <option value="">Selecione uma turma</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.courses?.nome ? `${t.courses.nome} — ` : ''}{t.nome} ({t.horario_inicio})
              </option>
            ))}
          </select>
        </div>

        {turma && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Para confirmar, digite o nome da turma: <strong>{turma.nome}</strong>
            </label>
            <input className={styles.input} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} />
          </div>
        )}

        <div>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={anonimizar}
            disabled={!turma || confirmacao.trim() !== turma.nome || running}
          >
            {running ? 'Anonimizando...' : 'Anonimizar turma'}
          </button>
        </div>
      </div>
    </>
  )
}
