'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import styles from '@/assets/css/admin.module.css'
import { Turma, Student, Course } from '@/lib/supabase/types'

interface TurmaWithDetails extends Turma {
  courses?: { nome: string; ano: number }
  studentCount?: number
  students?: Student[]
}

export default function ConsultaTurmas() {
  const [turmas, setTurmas] = useState<TurmaWithDetails[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTurma, setSelectedTurma] = useState<TurmaWithDetails | null>(null)
  const [filterCourse, setFilterCourse] = useState('')
  const [filterYear, setFilterYear] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [turmasRes, coursesRes, studentsRes] = await Promise.all([
        fetch('/api/admin/turmas'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/students')
      ])

      if (turmasRes.ok && coursesRes.ok && studentsRes.ok) {
        const turmasData: Turma[] = await turmasRes.json()
        const coursesData: Course[] = await coursesRes.json()
        const studentsData: Student[] = await studentsRes.json()

        // Enriquece turmas com contagem de alunos e dados do curso
        const enrichedTurmas: TurmaWithDetails[] = turmasData.map(turma => {
          const course = coursesData.find(c => c.id === turma.course_id)
          const turmaStudents = studentsData.filter(s => s.turma_id === turma.id)

          return {
            ...turma,
            courses: course ? { nome: course.nome, ano: course.ano } : undefined,
            studentCount: turmaStudents.length,
            students: turmaStudents
          }
        })

        setTurmas(enrichedTurmas)
        setCourses(coursesData)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Extrai anos únicos dos cursos
  const years = [...new Set(courses.map(c => c.ano))].sort((a, b) => b - a)

  const filteredTurmas = turmas.filter(turma => {
    const matchesCourse = !filterCourse || turma.course_id === filterCourse
    const matchesYear = !filterYear || turma.courses?.ano === parseInt(filterYear)

    return matchesCourse && matchesYear
  })

  function formatHorario(inicio: string, fim: string): string {
    return `${inicio.slice(0, 5)} - ${fim.slice(0, 5)}`
  }

  return (
    <AdminLayout>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Consulta de Turmas</h2>
        </div>

        {/* Estatísticas */}
        <div className={styles.statsGrid} style={{ marginBottom: '20px' }}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{turmas.length}</div>
            <div className={styles.statLabel}>Total de Turmas</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{courses.length}</div>
            <div className={styles.statLabel}>Total de Cursos</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {turmas.reduce((sum, t) => sum + (t.studentCount || 0), 0)}
            </div>
            <div className={styles.statLabel}>Total de Alunos</div>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.formRow} style={{ marginBottom: '20px' }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Filtrar por Curso</label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className={styles.select}
            >
              <option value="">Todos os cursos</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.nome} ({course.ano})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Filtrar por Ano</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className={styles.select}
            >
              <option value="">Todos os anos</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : filteredTurmas.length === 0 ? (
          <div className={styles.empty}>Nenhuma turma encontrada</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Turma</th>
                <th>Curso</th>
                <th>Ano</th>
                <th>Dia</th>
                <th>Horário</th>
                <th style={{ textAlign: 'center' }}>Alunos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTurmas.map(turma => (
                <tr key={turma.id}>
                  <td style={{ fontWeight: 500 }}>{turma.nome}</td>
                  <td>{turma.courses?.nome || '-'}</td>
                  <td>{turma.courses?.ano || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{turma.dia_semana}</td>
                  <td>{formatHorario(turma.horario_inicio, turma.horario_fim)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      background: 'var(--primary-blue)',
                      color: 'white'
                    }}>
                      {turma.studentCount}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={() => setSelectedTurma(turma)}
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: '15px', color: 'var(--gray-500)', fontSize: '14px' }}>
          Exibindo {filteredTurmas.length} de {turmas.length} turmas
        </div>
      </div>

      {/* Modal de Detalhes da Turma */}
      {selectedTurma && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: '700px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Detalhes da Turma</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedTurma(null)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Informações da Turma */}
              <div>
                <h4 style={{ color: 'var(--primary-blue)', marginBottom: '10px', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '5px' }}>
                  Informações da Turma
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Nome:</span>
                    <p style={{ margin: '5px 0' }}>{selectedTurma.nome}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Curso:</span>
                    <p style={{ margin: '5px 0' }}>{selectedTurma.courses?.nome || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Ano:</span>
                    <p style={{ margin: '5px 0' }}>{selectedTurma.courses?.ano || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Dia:</span>
                    <p style={{ margin: '5px 0', textTransform: 'capitalize' }}>{selectedTurma.dia_semana}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Horário:</span>
                    <p style={{ margin: '5px 0' }}>{formatHorario(selectedTurma.horario_inicio, selectedTurma.horario_fim)}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Total de Alunos:</span>
                    <p style={{ margin: '5px 0' }}>{selectedTurma.studentCount}</p>
                  </div>
                </div>
              </div>

              {/* Lista de Alunos */}
              <div>
                <h4 style={{ color: 'var(--primary-blue)', marginBottom: '10px', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '5px' }}>
                  Alunos Matriculados ({selectedTurma.studentCount})
                </h4>
                {selectedTurma.students && selectedTurma.students.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Responsável</th>
                          <th>Geração</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTurma.students.map(student => (
                          <tr key={student.id}>
                            <td>{student.nome}</td>
                            <td>{student.nome_responsavel || '-'}</td>
                            <td>{student.geracao || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.empty}>Nenhum aluno matriculado nesta turma</div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedTurma(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
