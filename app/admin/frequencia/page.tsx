'use client'

import { useEffect, useState } from 'react'
import { formatarData } from '@/lib/datas'
import styles from '@/assets/css/admin.module.css'
import { Turma, Student } from '@/lib/supabase/types'

interface AttendanceData {
  id: string
  student_id: string
  class_id: string
  status: 'presente' | 'falta'
  marked_at: string
  students: { nome: string }
  classes: { titulo: string; data_aula: string }
}

interface StudentFrequency {
  student: Student
  presencas: number
  faltas: number
  percentual: number
}

export default function ControleFrequencia() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [selectedTurma, setSelectedTurma] = useState('')
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [frequencyData, setFrequencyData] = useState<StudentFrequency[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'resumo' | 'detalhado'>('resumo')

  useEffect(() => {
    loadTurmas()
  }, [])

  useEffect(() => {
    if (selectedTurma) {
      loadFrequencyData()
    }
  }, [selectedTurma])

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

  async function loadFrequencyData() {
    try {
      setLoading(true)
      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(`/api/admin/students?turma_id=${selectedTurma}`),
        fetch(`/api/admin/attendance?turma_id=${selectedTurma}`)
      ])

      if (studentsRes.ok && attendanceRes.ok) {
        const students: Student[] = await studentsRes.json()
        // O servidor já filtra pela turma (e busca todas as páginas, sem o corte de 1000 linhas)
        const filteredAttendance: AttendanceData[] = await attendanceRes.json()
        setAttendanceData(filteredAttendance)

        // Calcula frequência por aluno
        const frequency: StudentFrequency[] = students.map(student => {
          const studentAttendance = filteredAttendance.filter(a => a.student_id === student.id)
          const presencas = studentAttendance.filter(a => a.status === 'presente').length
          const faltas = studentAttendance.filter(a => a.status === 'falta').length
          const total = presencas + faltas
          const percentual = total > 0 ? Math.round((presencas / total) * 100) : 0

          return { student, presencas, faltas, percentual }
        })

        // Ordena por nome
        frequency.sort((a, b) => a.student.nome.localeCompare(b.student.nome))
        setFrequencyData(frequency)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(percentual: number): string {
    if (percentual >= 75) return 'var(--success)'
    if (percentual >= 50) return 'orange'
    return 'var(--error)'
  }

  const totalPresencas = frequencyData.reduce((sum, f) => sum + f.presencas, 0)
  const totalFaltas = frequencyData.reduce((sum, f) => sum + f.faltas, 0)
  const mediaGeral = totalPresencas + totalFaltas > 0
    ? Math.round((totalPresencas / (totalPresencas + totalFaltas)) * 100)
    : 0

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Controle de Frequência</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`${styles.btn} ${viewMode === 'resumo' ? styles.btnPrimary : styles.btnSecondary}`}
              onClick={() => setViewMode('resumo')}
            >
              Resumo
            </button>
            <button
              className={`${styles.btn} ${viewMode === 'detalhado' ? styles.btnPrimary : styles.btnSecondary}`}
              onClick={() => setViewMode('detalhado')}
            >
              Detalhado
            </button>
          </div>
        </div>

        <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
          <label className={styles.label}>Turma</label>
          <select
            value={selectedTurma}
            onChange={(e) => setSelectedTurma(e.target.value)}
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

        {selectedTurma && (
          <>
            {/* Estatísticas Gerais */}
            <div className={styles.statsGrid} style={{ marginBottom: '20px' }}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{frequencyData.length}</div>
                <div className={styles.statLabel}>Total de Alunos</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: 'var(--success)' }}>{totalPresencas}</div>
                <div className={styles.statLabel}>Total Presenças</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: 'var(--error)' }}>{totalFaltas}</div>
                <div className={styles.statLabel}>Total Faltas</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: getStatusColor(mediaGeral) }}>{mediaGeral}%</div>
                <div className={styles.statLabel}>Frequência Média</div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>Carregando...</div>
            ) : viewMode === 'resumo' ? (
              /* Visão Resumo */
              frequencyData.length === 0 ? (
                <div className={styles.empty}>Nenhum dado de frequência</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th style={{ textAlign: 'center' }}>Presenças</th>
                      <th style={{ textAlign: 'center' }}>Faltas</th>
                      <th style={{ textAlign: 'center' }}>Frequência</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequencyData.map(({ student, presencas, faltas, percentual }) => (
                      <tr key={student.id}>
                        <td>{student.nome}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{presencas}</td>
                        <td style={{ textAlign: 'center', color: 'var(--error)', fontWeight: 600 }}>{faltas}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{
                            width: '100%',
                            height: '20px',
                            background: 'var(--gray-200)',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: `${percentual}%`,
                              height: '100%',
                              background: getStatusColor(percentual),
                              borderRadius: '10px',
                              transition: 'width 0.3s'
                            }} />
                            <span style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              {percentual}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: getStatusColor(percentual),
                            color: 'white'
                          }}>
                            {percentual >= 75 ? 'Regular' : percentual >= 50 ? 'Atenção' : 'Crítico'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              /* Visão Detalhada */
              attendanceData.length === 0 ? (
                <div className={styles.empty}>Nenhum registro de chamada</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Aula</th>
                      <th>Aluno</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map(record => (
                      <tr key={record.id}>
                        <td>{record.classes?.data_aula ? formatarData(record.classes.data_aula) : '-'}</td>
                        <td>{record.classes?.titulo || '-'}</td>
                        <td>{record.students?.nome || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: record.status === 'presente' ? 'var(--success)' : 'var(--error)',
                            color: 'white'
                          }}>
                            {record.status === 'presente' ? 'Presente' : 'Falta'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </>
        )}
      </div>
    </>
  )
}
