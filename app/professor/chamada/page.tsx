'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/assets/css/professor.module.css'

interface User {
  id: string
  nome: string
  role: string
}

interface Turma {
  id: string
  nome: string
  horario_inicio: string
  horario_fim: string
  dia_semana: string
  courses: {
    id: string
    nome: string
    ano: number
  }
}

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
  classes: Class[]
}

interface Student {
  id: string
  nome: string
  status: 'presente' | 'falta' | null
}

type Screen = 'turmas' | 'aulas' | 'chamada'

export default function ProfessorChamada() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [screen, setScreen] = useState<Screen>('turmas')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // Dados
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data) {
          router.replace('/login')
          return
        }
        if (data.role === 'admin') {
          router.replace('/admin/dashboard')
          return
        }
        setUser(data)
        loadTurmas()
      })
      .catch(() => router.replace('/login'))
  }, [router])

  async function loadTurmas() {
    setLoading(true)
    try {
      const res = await fetch('/api/professor/turmas')
      const data = await res.json()
      setTurmas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function selectTurma(turma: Turma) {
    setSelectedTurma(turma)
    setLoading(true)
    try {
      const res = await fetch(`/api/professor/turmas/${turma.id}/classes`)
      const data = await res.json()
      setModules(data.modules || [])
      setScreen('aulas')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function selectClass(cls: Class) {
    if (!selectedTurma) return
    setSelectedClass(cls)
    setLoading(true)
    try {
      const res = await fetch(`/api/professor/attendance?class_id=${cls.id}&turma_id=${selectedTurma.id}`)
      const data = await res.json()
      setStudents(data)
      setScreen('chamada')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function setStatus(studentId: string, status: 'presente' | 'falta') {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, status } : s
    ))
  }

  async function saveChamada() {
    if (!selectedClass || !user) return

    const unmarked = students.filter(s => !s.status)
    if (unmarked.length > 0) {
      alert(`Faltam ${unmarked.length} aluno(s) sem marcar presença.`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/professor/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass.id,
          attendance: students.map(s => ({
            student_id: s.id,
            status: s.status
          }))
        })
      })

      if (res.ok) {
        setSuccess('Chamada salva com sucesso!')
        setTimeout(() => {
          setSuccess('')
          setScreen('aulas')
        }, 2000)
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar chamada')
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    if (screen === 'chamada') {
      setScreen('aulas')
      setSelectedClass(null)
    } else if (screen === 'aulas') {
      setScreen('turmas')
      setSelectedTurma(null)
      setModules([])
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  const presentes = students.filter(s => s.status === 'presente').length
  const faltas = students.filter(s => s.status === 'falta').length

  if (!user) return null

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {screen !== 'turmas' && (
              <button className={styles.backBtn} onClick={goBack}>
                ←
              </button>
            )}
            <span className={styles.headerTitle}>
              {screen === 'turmas' && 'Minhas Turmas'}
              {screen === 'aulas' && selectedTurma?.nome}
              {screen === 'chamada' && 'Chamada'}
            </span>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <div className={styles.content} style={{ paddingBottom: screen === 'chamada' ? '100px' : undefined }}>
        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : (
          <>
            {/* TELA DE TURMAS */}
            {screen === 'turmas' && (
              <div className={styles.turmasList}>
                {turmas.length === 0 ? (
                  <div className={styles.empty}>
                    Você não está atribuído a nenhuma turma.
                  </div>
                ) : (
                  turmas.map(t => (
                    <div
                      key={t.id}
                      className={styles.turmaCard}
                      onClick={() => selectTurma(t)}
                    >
                      <div className={styles.turmaNome}>{t.nome}</div>
                      <div className={styles.turmaInfo}>{t.courses?.nome}</div>
                      <div className={styles.turmaHorario}>
                        <span>{t.dia_semana}</span>
                        <span>•</span>
                        <span>{t.horario_inicio} - {t.horario_fim}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TELA DE AULAS */}
            {screen === 'aulas' && (
              <div className={styles.modulesList}>
                {modules.length === 0 ? (
                  <div className={styles.empty}>
                    Nenhum módulo cadastrado para este curso.
                  </div>
                ) : (
                  modules.map(m => (
                    <div key={m.id} className={styles.moduleCard}>
                      <div className={styles.moduleHeader}>
                        <span className={styles.moduleName}>
                          Módulo {m.ordem}: {m.nome}
                        </span>
                      </div>
                      <ul className={styles.classesList}>
                        {m.classes.length === 0 ? (
                          <li className={styles.classItem} style={{ cursor: 'default' }}>
                            <span style={{ color: 'var(--gray-400)' }}>
                              Nenhuma aula cadastrada
                            </span>
                          </li>
                        ) : (
                          m.classes.map(c => (
                            <li
                              key={c.id}
                              className={styles.classItem}
                              onClick={() => selectClass(c)}
                            >
                              <div>
                                <div className={styles.className}>
                                  Aula {c.ordem}: {c.titulo}
                                </div>
                                {c.data_aula && (
                                  <div className={styles.classDate}>
                                    {new Date(c.data_aula).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                              <span>→</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TELA DE CHAMADA */}
            {screen === 'chamada' && (
              <>
                <div className={styles.chamadaHeader}>
                  <h2 className={styles.chamadaTitle}>
                    {selectedClass?.titulo}
                  </h2>
                  <p className={styles.chamadaSubtitle}>
                    {selectedTurma?.nome}
                  </p>
                </div>

                {success && <div className={styles.success}>{success}</div>}

                <div className={styles.chamadaStats}>
                  <div className={styles.statBox}>
                    <div className={`${styles.statNumber} ${styles.statNumberPresente}`}>
                      {presentes}
                    </div>
                    <div className={styles.statLabel}>Presentes</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={`${styles.statNumber} ${styles.statNumberFalta}`}>
                      {faltas}
                    </div>
                    <div className={styles.statLabel}>Faltas</div>
                  </div>
                </div>

                <div className={styles.alunosList}>
                  {students.length === 0 ? (
                    <div className={styles.empty}>
                      Nenhum aluno nesta turma.
                    </div>
                  ) : (
                    students.map(s => (
                      <div key={s.id} className={styles.alunoCard}>
                        <span className={styles.alunoNome}>{s.nome}</span>
                        <div className={styles.presencaBtns}>
                          <button
                            className={`${styles.presencaBtn} ${styles.btnPresente} ${s.status === 'presente' ? styles.active : ''}`}
                            onClick={() => setStatus(s.id, 'presente')}
                            title="Presente"
                          >
                            ✓
                          </button>
                          <button
                            className={`${styles.presencaBtn} ${styles.btnFalta} ${s.status === 'falta' ? styles.active : ''}`}
                            onClick={() => setStatus(s.id, 'falta')}
                            title="Falta"
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Botão de Salvar fixo no rodapé */}
      {screen === 'chamada' && students.length > 0 && (
        <div className={styles.saveContainer}>
          <button
            className={styles.saveBtn}
            onClick={saveChamada}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Chamada'}
          </button>
        </div>
      )}
    </div>
  )
}
