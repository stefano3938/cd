'use client'

import { useEffect, useState, useRef } from 'react'
import styles from '@/assets/css/admin.module.css'

interface Turma { id: string; nome: string }
interface Student {
  id: string
  nome: string
  email?: string
  telefone?: string
  turma_id: string
  turmas: { nome: string }
}

interface ImportStudent {
  nome: string
  email?: string
  telefone?: string
}

export default function AlunosPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [filterTurma, setFilterTurma] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', turma_id: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importing, setImporting] = useState(false)
  const [importTurma, setImportTurma] = useState('')
  const [importPreview, setImportPreview] = useState<ImportStudent[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const url = filterTurma ? `/api/admin/students?turma_id=${filterTurma}` : '/api/admin/students'
    const [s, t] = await Promise.all([
      fetch(url).then(r => r.json()),
      fetch('/api/admin/turmas').then(r => r.json())
    ])
    setStudents(s)
    setTurmas(t)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterTurma])

  function openNew() {
    setEditing(null)
    setForm({ nome: '', email: '', telefone: '', turma_id: turmas[0]?.id || '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(s: Student) {
    setEditing(s)
    setForm({ nome: s.nome, email: s.email || '', telefone: s.telefone || '', turma_id: s.turma_id })
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const url = editing ? `/api/admin/students/${editing.id}` : '/api/admin/students'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    setShowModal(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir aluno? Os dados dele e todas as presenças serão apagados definitivamente.')) return
    const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erro ao excluir aluno')
      return
    }
    load()
  }

  // Importação
  function openImport() {
    setImportTurma(turmas[0]?.id || '')
    setImportPreview([])
    setError('')
    setSuccess('')
    setShowImportModal(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function parseCSV(text: string): ImportStudent[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) return []

    // Detectar separador (vírgula, ponto-e-vírgula ou tab)
    const firstLine = lines[0]
    const separator = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

    // Verificar se primeira linha é cabeçalho
    const firstLineUpper = firstLine.toUpperCase()
    const hasHeader = firstLineUpper.includes('NOME') || firstLineUpper.includes('EMAIL') || firstLineUpper.includes('NAME')
    const startIndex = hasHeader ? 1 : 0

    const students: ImportStudent[] = []
    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''))
      if (cols.length > 0 && cols[0]) {
        students.push({
          nome: cols[0],
          email: cols[1] || undefined,
          telefone: cols[2] || undefined
        })
      }
    }
    return students
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCSV(text)
      setImportPreview(parsed)
      setError('')
    }
    reader.onerror = () => {
      setError('Erro ao ler arquivo')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importTurma) {
      setError('Selecione uma turma')
      return
    }
    if (importPreview.length === 0) {
      setError('Nenhum aluno para importar')
      return
    }

    setImporting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: importPreview,
          turma_id: importTurma
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setSuccess(`${data.imported} aluno(s) importado(s) com sucesso!`)
      setTimeout(() => {
        setShowImportModal(false)
        setSuccess('')
        load()
      }, 2000)
    } catch (e) {
      setError('Erro ao importar alunos')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Alunos</h2>
          <div className={styles.actions}>
            <select className={styles.select} value={filterTurma} onChange={e => setFilterTurma(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Todas as turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={openImport}>Importar CSV</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNew}>Novo Aluno</button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : students.length === 0 ? (
          <div className={styles.empty}>Nenhum aluno cadastrado</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Turma</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>{s.nome}</td>
                  <td>{s.email || '-'}</td>
                  <td>{s.telefone || '-'}</td>
                  <td>{s.turmas?.nome}</td>
                  <td className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEdit(s)}>Editar</button>
                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDelete(s.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editing ? 'Editar Aluno' : 'Novo Aluno'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome</label>
                <input className={styles.input} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input className={styles.input} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Telefone</label>
                <input className={styles.input} value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Turma</label>
                <select className={styles.select} value={form.turma_id} onChange={e => setForm({...form, turma_id: e.target.value})} required>
                  <option value="">Selecione...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Importar Alunos</h3>
              <button className={styles.closeBtn} onClick={() => setShowImportModal(false)}>&times;</button>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Turma de destino</label>
                <select
                  className={styles.select}
                  value={importTurma}
                  onChange={e => setImportTurma(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Arquivo CSV</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className={styles.input}
                />
                <small style={{ color: 'var(--gray-500)', marginTop: '0.25rem', display: 'block' }}>
                  Formato esperado: Nome, Email, Telefone (uma linha por aluno)
                </small>
              </div>

              {importPreview.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Preview ({importPreview.length} alunos)</label>
                  <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                    <table className={styles.table} style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Email</th>
                          <th>Telefone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 10).map((s, i) => (
                          <tr key={i}>
                            <td>{s.nome}</td>
                            <td>{s.email || '-'}</td>
                            <td>{s.telefone || '-'}</td>
                          </tr>
                        ))}
                        {importPreview.length > 10 && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
                              ... e mais {importPreview.length - 10} alunos
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setShowImportModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleImport}
                  disabled={importing || importPreview.length === 0 || !importTurma}
                >
                  {importing ? 'Importando...' : `Importar ${importPreview.length} aluno(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
