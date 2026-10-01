'use client'

import { useEffect, useState } from 'react'
import styles from '@/assets/css/admin.module.css'

interface Course { id: string; nome: string }
interface Professor { id: string; nome: string }
interface Turma {
  id: string
  nome: string
  horario_inicio: string
  horario_fim: string
  dia_semana: string
  course_id: string
  courses: { nome: string }
  turma_professors: { professor_id: string; users: { id: string; nome: string } }[]
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Turma | null>(null)
  const [form, setForm] = useState({
    course_id: '',
    nome: '',
    horario_inicio: '08:00',
    horario_fim: '09:30',
    dia_semana: 'domingo',
    professor_ids: [] as string[]
  })
  const [error, setError] = useState('')

  async function load() {
    const [t, c, p] = await Promise.all([
      fetch('/api/admin/turmas').then(r => r.json()),
      fetch('/api/admin/courses').then(r => r.json()),
      fetch('/api/admin/professors').then(r => r.json())
    ])
    setTurmas(t)
    setCourses(c)
    setProfessors(p)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({
      course_id: courses[0]?.id || '',
      nome: '',
      horario_inicio: '08:00',
      horario_fim: '09:30',
      dia_semana: 'domingo',
      professor_ids: []
    })
    setError('')
    setShowModal(true)
  }

  function openEdit(t: Turma) {
    setEditing(t)
    setForm({
      course_id: t.course_id,
      nome: t.nome,
      horario_inicio: t.horario_inicio,
      horario_fim: t.horario_fim,
      dia_semana: t.dia_semana,
      professor_ids: t.turma_professors?.map(tp => tp.professor_id) || []
    })
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const url = editing ? `/api/admin/turmas/${editing.id}` : '/api/admin/turmas'
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
    if (!confirm('Excluir turma?')) return
    await fetch(`/api/admin/turmas/${id}`, { method: 'DELETE' })
    load()
  }

  function toggleProfessor(id: string) {
    setForm(f => ({
      ...f,
      professor_ids: f.professor_ids.includes(id)
        ? f.professor_ids.filter(p => p !== id)
        : [...f.professor_ids, id]
    }))
  }

  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Turmas</h2>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNew}>Nova Turma</button>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : turmas.length === 0 ? (
          <div className={styles.empty}>Nenhuma turma cadastrada</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Curso</th>
                <th>Horário</th>
                <th>Dia</th>
                <th>Professores</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {turmas.map(t => (
                <tr key={t.id}>
                  <td>{t.nome}</td>
                  <td>{t.courses?.nome}</td>
                  <td>{t.horario_inicio} - {t.horario_fim}</td>
                  <td>{t.dia_semana}</td>
                  <td>{t.turma_professors?.map(tp => tp.users?.nome).join(', ') || '-'}</td>
                  <td className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEdit(t)}>Editar</button>
                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDelete(t.id)}>Excluir</button>
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
              <h3 className={styles.modalTitle}>{editing ? 'Editar Turma' : 'Nova Turma'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Curso</label>
                <select className={styles.select} value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} required disabled={!!editing}>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome da Turma</label>
                <input className={styles.input} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required placeholder="Ex: Turma A" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Horário Início</label>
                  <input className={styles.input} type="time" value={form.horario_inicio} onChange={e => setForm({...form, horario_inicio: e.target.value})} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Horário Fim</label>
                  <input className={styles.input} type="time" value={form.horario_fim} onChange={e => setForm({...form, horario_fim: e.target.value})} required />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Dia da Semana</label>
                <select className={styles.select} value={form.dia_semana} onChange={e => setForm({...form, dia_semana: e.target.value})}>
                  {dias.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Professores</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {professors.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={form.professor_ids.includes(p.id)} onChange={() => toggleProfessor(p.id)} />
                      {p.nome}
                    </label>
                  ))}
                </div>
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
