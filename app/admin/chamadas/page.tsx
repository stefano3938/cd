'use client'

import { useEffect, useState } from 'react'
import { formatarData } from '@/lib/datas'
import styles from '@/assets/css/admin.module.css'
import { Turma, Student, Class } from '@/lib/supabase/types'

interface AttendanceRecord {
  student_id: string
  status: 'presente' | 'falta'
}

export default function CadernetaChamadas() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedTurma, setSelectedTurma] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadTurmas()
  }, [])

  useEffect(() => {
    if (selectedTurma) {
      loadStudentsAndClasses()
    }
  }, [selectedTurma])

  useEffect(() => {
    if (selectedClass && students.length > 0) {
      loadExistingAttendance()
    }
  }, [selectedClass, students])

  async function loadTurmas() {
    try {
      const res = await fetch('/api/admin/turmas')
      if (res.ok) {
        const data = await res.json()
        setTurmas(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudentsAndClasses() {
    try {
      setLoading(true)
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/admin/students?turma_id=${selectedTurma}`),
        fetch('/api/admin/classes')
      ])

      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data)
        // Inicializa todos como falta
        setAttendance(data.map((s: Student) => ({ student_id: s.id, status: 'falta' as const })))
      }

      if (classesRes.ok) {
        const data = await classesRes.json()
        setClasses(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadExistingAttendance() {
    try {
      const res = await fetch(`/api/admin/attendance?class_id=${selectedClass}`)
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          // Atualiza com dados existentes
          const existingMap = new Map(data.map((a: { student_id: string; status: string }) => [a.student_id, a.status]))
          setAttendance(students.map(s => ({
            student_id: s.id,
            status: (existingMap.get(s.id) || 'falta') as 'presente' | 'falta'
          })))
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  function toggleAttendance(studentId: string) {
    setAttendance(prev => prev.map(a => {
      if (a.student_id === studentId) {
        return { ...a, status: a.status === 'presente' ? 'falta' : 'presente' }
      }
      return a
    }))
  }

  function markAllPresent() {
    setAttendance(prev => prev.map(a => ({ ...a, status: 'presente' as const })))
  }

  function markAllAbsent() {
    setAttendance(prev => prev.map(a => ({ ...a, status: 'falta' as const })))
  }

  async function handleSave() {
    if (!selectedClass) {
      setError('Selecione uma aula')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass,
          attendance: attendance
        })
      })

      if (res.ok) {
        setSuccess('Chamada salva com sucesso!')
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao salvar chamada')
      }
    } catch {
      setError('Erro ao salvar chamada')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = attendance.filter(a => a.status === 'presente').length
  const absentCount = attendance.filter(a => a.status === 'falta').length

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Caderneta de Chamadas</h2>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Turma *</label>
              <select
                value={selectedTurma}
                onChange={(e) => {
                  setSelectedTurma(e.target.value)
                  setSelectedClass('')
                }}
                className={styles.select}
              >
                <option value="">Selecione uma turma</option>
                {turmas.map(turma => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome} - {turma.horario_inicio}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Aula *</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={styles.select}
                disabled={!selectedTurma}
              >
                <option value="">Selecione uma aula</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.titulo} {cls.data_aula ? `- ${formatarData(cls.data_aula)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedTurma && selectedClass && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', padding: '15px', background: 'var(--gray-100)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                  Presentes: {presentCount}
                </span>
                <span style={{ color: 'var(--error)', fontWeight: 600 }}>
                  Faltas: {absentCount}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  onClick={markAllPresent}
                >
                  Todos Presentes
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  onClick={markAllAbsent}
                >
                  Todos Ausentes
                </button>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>Carregando...</div>
            ) : students.length === 0 ? (
              <div className={styles.empty}>Nenhum aluno nesta turma</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {students.map(student => {
                  const record = attendance.find(a => a.student_id === student.id)
                  const isPresent = record?.status === 'presente'

                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleAttendance(student.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px 20px',
                        background: isPresent ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `2px solid ${isPresent ? 'var(--success)' : 'var(--error)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{student.nome}</span>
                      <span style={{
                        padding: '5px 15px',
                        borderRadius: '20px',
                        fontWeight: 600,
                        fontSize: '14px',
                        background: isPresent ? 'var(--success)' : 'var(--error)',
                        color: 'white'
                      }}>
                        {isPresent ? 'PRESENTE' : 'FALTA'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Chamada'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
