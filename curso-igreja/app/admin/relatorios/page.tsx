'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import styles from '@/assets/css/admin.module.css'

interface TurmaSummary {
  id: string
  nome: string
  curso: string
  total_alunos: number
}

interface StudentReport {
  id: string
  nome: string
  presencas: number
  faltas: number
  total: number
  percentual: number
  detalhes: {
    class_id: string
    titulo: string
    module: string
    status: 'presente' | 'falta' | null
  }[]
}

interface ClassInfo {
  id: string
  titulo: string
  module: string
}

interface Turma {
  id: string
  nome: string
  courses: { nome: string }
}

export default function RelatoriosPage() {
  const [turmas, setTurmas] = useState<TurmaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTurma, setSelectedTurma] = useState<string>('')
  const [turmaInfo, setTurmaInfo] = useState<Turma | null>(null)
  const [students, setStudents] = useState<StudentReport[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    loadTurmas()
  }, [])

  async function loadTurmas() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports/attendance')
      const data = await res.json()
      setTurmas(data.turmas || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadReport(turmaId: string) {
    if (!turmaId) {
      setStudents([])
      setClasses([])
      setTurmaInfo(null)
      return
    }

    setLoadingReport(true)
    try {
      const res = await fetch(`/api/admin/reports/attendance?turma_id=${turmaId}`)
      const data = await res.json()
      setTurmaInfo(data.turma)
      setStudents(data.students || [])
      setClasses(data.classes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReport(false)
    }
  }

  function handleTurmaChange(turmaId: string) {
    setSelectedTurma(turmaId)
    loadReport(turmaId)
  }

  function getStatusColor(percentual: number) {
    if (percentual >= 75) return 'var(--success)'
    if (percentual >= 50) return 'var(--warning, #f59e0b)'
    return 'var(--error)'
  }

  function exportCSV() {
    if (students.length === 0) return

    const headers = ['Nome', 'Presenças', 'Faltas', 'Total Aulas', '% Presença']
    const rows = students.map(s => [
      s.nome,
      s.presencas,
      s.faltas,
      s.total,
      `${s.percentual}%`
    ])

    const csv = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_${turmaInfo?.nome || 'turma'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Relatórios de Presença</h2>
          <div className={styles.actions}>
            <select
              className={styles.select}
              value={selectedTurma}
              onChange={e => handleTurmaChange(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="">Selecione uma turma...</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} - {t.curso} ({t.total_alunos} alunos)
                </option>
              ))}
            </select>
            {students.length > 0 && (
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={exportCSV}>
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : !selectedTurma ? (
          <div className={styles.empty}>Selecione uma turma para ver o relatório</div>
        ) : loadingReport ? (
          <div className={styles.loading}>Carregando relatório...</div>
        ) : students.length === 0 ? (
          <div className={styles.empty}>Nenhum aluno nesta turma</div>
        ) : (
          <>
            {/* Resumo */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h3 style={{ fontSize: 'var(--font-base)', marginBottom: 'var(--spacing-sm)' }}>
                {turmaInfo?.nome} - {turmaInfo?.courses?.nome}
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>
                {students.length} alunos | {classes.length} aulas cadastradas
              </p>
            </div>

            {/* Tabela de Alunos */}
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th style={{ textAlign: 'center' }}>Presenças</th>
                  <th style={{ textAlign: 'center' }}>Faltas</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>% Presença</th>
                </tr>
              </thead>
              <tbody>
                {students.sort((a, b) => a.nome.localeCompare(b.nome)).map(s => (
                  <tr key={s.id}>
                    <td>{s.nome}</td>
                    <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                      {s.presencas}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--error)', fontWeight: 600 }}>
                      {s.faltas}
                    </td>
                    <td style={{ textAlign: 'center' }}>{s.total}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        color: getStatusColor(s.percentual),
                        fontWeight: 600
                      }}>
                        {s.percentual}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Estatísticas Gerais */}
            <div style={{
              marginTop: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)'
            }}>
              <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                Estatísticas Gerais
              </h4>
              <div style={{ display: 'flex', gap: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Média de Presença:</span>
                  <span style={{ marginLeft: 'var(--spacing-xs)', fontWeight: 600 }}>
                    {students.length > 0
                      ? Math.round(students.reduce((acc, s) => acc + s.percentual, 0) / students.length)
                      : 0}%
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Alunos com +75%:</span>
                  <span style={{ marginLeft: 'var(--spacing-xs)', fontWeight: 600, color: 'var(--success)' }}>
                    {students.filter(s => s.percentual >= 75).length}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Alunos com -50%:</span>
                  <span style={{ marginLeft: 'var(--spacing-xs)', fontWeight: 600, color: 'var(--error)' }}>
                    {students.filter(s => s.percentual < 50).length}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
