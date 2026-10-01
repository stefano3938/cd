'use client'

import { useEffect, useState } from 'react'
import styles from '@/assets/css/admin.module.css'

interface Professor {
  id: string
  nome: string
  email: string
  telefone?: string
}

export default function ProfessoresPage() {
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Professor | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' })
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/professors')
    const data = await res.json()
    setProfessors(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ nome: '', email: '', telefone: '', senha: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(p: Professor) {
    setEditing(p)
    setForm({ nome: p.nome, email: p.email, telefone: p.telefone || '', senha: '' })
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const url = editing ? `/api/admin/professors/${editing.id}` : '/api/admin/professors'
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
    if (!confirm('Excluir professor? As chamadas que ele já fez continuam registradas.')) return
    const res = await fetch(`/api/admin/professors/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erro ao excluir professor')
      return
    }
    load()
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Professores</h2>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNew}>
            Novo Professor
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : professors.length === 0 ? (
          <div className={styles.empty}>Nenhum professor cadastrado</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {professors.map(p => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.email}</td>
                  <td>{p.telefone || '-'}</td>
                  <td className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEdit(p)}>Editar</button>
                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDelete(p.id)}>Excluir</button>
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
              <h3 className={styles.modalTitle}>{editing ? 'Editar Professor' : 'Novo Professor'}</h3>
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
                <input className={styles.input} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Telefone</label>
                <input className={styles.input} value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}</label>
                <input className={styles.input} type="password" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} required={!editing} />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
