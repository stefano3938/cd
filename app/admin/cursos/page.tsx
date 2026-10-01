'use client'

import { useEffect, useState } from 'react'
import styles from '@/assets/css/admin.module.css'

interface Class {
  id: string
  titulo: string
  ordem: number
  data_aula?: string
}

interface Module {
  id: string
  nome: string
  ordem: number
  numero_de_aulas: number
  classes?: Class[]
}

interface Course {
  id: string
  nome: string
  ano: number
  descricao?: string
  modules: Module[]
}

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showClassModal, setShowClassModal] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [form, setForm] = useState({ nome: '', ano: new Date().getFullYear(), descricao: '' })
  const [moduleForm, setModuleForm] = useState({ nome: '', ordem: 1, numero_de_aulas: 4 })
  const [classForm, setClassForm] = useState({ titulo: '', ordem: 1, data_aula: '' })
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/courses')
    const data = await res.json()
    setCourses(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ nome: '', ano: new Date().getFullYear(), descricao: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(c: Course) {
    setEditing(c)
    setForm({ nome: c.nome, ano: c.ano, descricao: c.descricao || '' })
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const url = editing ? `/api/admin/courses/${editing.id}` : '/api/admin/courses'
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
    if (!confirm('Excluir curso e todos seus módulos?')) return
    await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
    load()
  }

  function openModules(c: Course) {
    setSelectedCourse(c)
    setSelectedModule(null)
    setClasses([])
  }

  function openNewModule() {
    setEditingModule(null)
    const nextOrder = (selectedCourse?.modules.length || 0) + 1
    setModuleForm({ nome: '', ordem: nextOrder, numero_de_aulas: 4 })
    setError('')
    setShowModuleModal(true)
  }

  function openEditModule(m: Module) {
    setEditingModule(m)
    setModuleForm({ nome: m.nome, ordem: m.ordem, numero_de_aulas: m.numero_de_aulas })
    setError('')
    setShowModuleModal(true)
  }

  async function handleModuleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const url = editingModule ? `/api/admin/modules/${editingModule.id}` : '/api/admin/modules'
    const method = editingModule ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...moduleForm, course_id: selectedCourse?.id })
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    setShowModuleModal(false)
    load()
    const updated = await fetch(`/api/admin/courses/${selectedCourse?.id}`).then(r => r.json())
    setSelectedCourse(updated)
  }

  async function handleDeleteModule(id: string) {
    if (!confirm('Excluir módulo e suas aulas?')) return
    await fetch(`/api/admin/modules/${id}`, { method: 'DELETE' })
    load()
    const updated = await fetch(`/api/admin/courses/${selectedCourse?.id}`).then(r => r.json())
    setSelectedCourse(updated)
    if (selectedModule?.id === id) {
      setSelectedModule(null)
      setClasses([])
    }
  }

  // Classes/Aulas functions
  async function openClasses(m: Module) {
    setSelectedModule(m)
    const res = await fetch(`/api/admin/classes?module_id=${m.id}`)
    const data = await res.json()
    setClasses(data)
  }

  function openNewClass() {
    setEditingClass(null)
    const nextOrder = classes.length + 1
    setClassForm({ titulo: '', ordem: nextOrder, data_aula: '' })
    setError('')
    setShowClassModal(true)
  }

  function openEditClass(c: Class) {
    setEditingClass(c)
    setClassForm({ titulo: c.titulo, ordem: c.ordem, data_aula: c.data_aula || '' })
    setError('')
    setShowClassModal(true)
  }

  async function handleClassSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const url = editingClass ? `/api/admin/classes/${editingClass.id}` : '/api/admin/classes'
    const method = editingClass ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...classForm,
        module_id: selectedModule?.id,
        data_aula: classForm.data_aula || null
      })
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    setShowClassModal(false)
    if (selectedModule) {
      const updated = await fetch(`/api/admin/classes?module_id=${selectedModule.id}`).then(r => r.json())
      setClasses(updated)
    }
  }

  async function handleDeleteClass(id: string) {
    if (!confirm('Excluir aula?')) return
    await fetch(`/api/admin/classes/${id}`, { method: 'DELETE' })
    if (selectedModule) {
      const updated = await fetch(`/api/admin/classes?module_id=${selectedModule.id}`).then(r => r.json())
      setClasses(updated)
    }
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Cursos</h2>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNew}>Novo Curso</button>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : courses.length === 0 ? (
          <div className={styles.empty}>Nenhum curso cadastrado</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ano</th>
                <th>Módulos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.ano}</td>
                  <td>{c.modules?.length || 0}</td>
                  <td className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openModules(c)}>Módulos</button>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEdit(c)}>Editar</button>
                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDelete(c.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedCourse && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Módulos: {selectedCourse.nome}</h2>
            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNewModule}>Novo Módulo</button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setSelectedCourse(null); setSelectedModule(null); setClasses([]) }}>Fechar</button>
            </div>
          </div>
          {selectedCourse.modules?.length === 0 ? (
            <div className={styles.empty}>Nenhum módulo</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Nome</th>
                  <th>Nº Aulas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {selectedCourse.modules?.sort((a,b) => a.ordem - b.ordem).map(m => (
                  <tr key={m.id} style={{ background: selectedModule?.id === m.id ? 'var(--blue-light)' : undefined }}>
                    <td>{m.ordem}</td>
                    <td>{m.nome}</td>
                    <td>{m.numero_de_aulas}</td>
                    <td className={styles.actions}>
                      <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => openClasses(m)}>Aulas</button>
                      <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEditModule(m)}>Editar</button>
                      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDeleteModule(m.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedModule && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Aulas: {selectedModule.nome}</h2>
            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNewClass}>Nova Aula</button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setSelectedModule(null); setClasses([]) }}>Fechar</button>
            </div>
          </div>
          {classes.length === 0 ? (
            <div className={styles.empty}>Nenhuma aula cadastrada</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Título</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {classes.sort((a,b) => a.ordem - b.ordem).map(c => (
                  <tr key={c.id}>
                    <td>{c.ordem}</td>
                    <td>{c.titulo}</td>
                    <td>{c.data_aula ? new Date(c.data_aula).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className={styles.actions}>
                      <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEditClass(c)}>Editar</button>
                      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDeleteClass(c.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editing ? 'Editar Curso' : 'Novo Curso'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome</label>
                <input className={styles.input} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ano</label>
                <input className={styles.input} type="number" value={form.ano} onChange={e => setForm({...form, ano: parseInt(e.target.value)})} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Descrição</label>
                <input className={styles.input} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModuleModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModuleModal(false)}>&times;</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleModuleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome</label>
                <input className={styles.input} value={moduleForm.nome} onChange={e => setModuleForm({...moduleForm, nome: e.target.value})} required />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ordem</label>
                  <input className={styles.input} type="number" value={moduleForm.ordem} onChange={e => setModuleForm({...moduleForm, ordem: parseInt(e.target.value)})} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nº de Aulas</label>
                  <input className={styles.input} type="number" value={moduleForm.numero_de_aulas} onChange={e => setModuleForm({...moduleForm, numero_de_aulas: parseInt(e.target.value)})} required />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModuleModal(false)}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingClass ? 'Editar Aula' : 'Nova Aula'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowClassModal(false)}>&times;</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleClassSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Título</label>
                <input className={styles.input} value={classForm.titulo} onChange={e => setClassForm({...classForm, titulo: e.target.value})} required placeholder="Ex: Introdução ao Módulo" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ordem</label>
                  <input className={styles.input} type="number" value={classForm.ordem} onChange={e => setClassForm({...classForm, ordem: parseInt(e.target.value)})} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Data (opcional)</label>
                  <input className={styles.input} type="date" value={classForm.data_aula} onChange={e => setClassForm({...classForm, data_aula: e.target.value})} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowClassModal(false)}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
