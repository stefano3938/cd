'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import styles from '@/assets/css/admin.module.css'
import { Student, Turma } from '@/lib/supabase/types'

export default function ConsultaCadastros() {
  const [students, setStudents] = useState<Student[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTurma, setFilterTurma] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [studentsRes, turmasRes] = await Promise.all([
        fetch('/api/admin/students'),
        fetch('/api/admin/turmas')
      ])

      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data)
      }

      if (turmasRes.ok) {
        const data = await turmasRes.json()
        setTurmas(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function calcularIdade(dataNascimento: string): number {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  function getTurmaLabel(turmaId: string): string {
    const turma = turmas.find(t => t.id === turmaId)
    return turma ? `${turma.nome} - ${turma.horario_inicio}` : '-'
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nome_responsavel?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTurma = !filterTurma || student.turma_id === filterTurma

    return matchesSearch && matchesTurma
  })

  return (
    <AdminLayout>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Consulta de Cadastros</h2>
        </div>

        {/* Filtros */}
        <div className={styles.formRow} style={{ marginBottom: '20px' }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Buscar</label>
            <input
              type="text"
              placeholder="Nome, e-mail ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Filtrar por Turma</label>
            <select
              value={filterTurma}
              onChange={(e) => setFilterTurma(e.target.value)}
              className={styles.select}
            >
              <option value="">Todas as turmas</option>
              {turmas.map(turma => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome} - {turma.horario_inicio}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : filteredStudents.length === 0 ? (
          <div className={styles.empty}>Nenhum aluno encontrado</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Idade</th>
                <th>Turma</th>
                <th>Responsável</th>
                <th>Geração</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id}>
                  <td>{student.nome}</td>
                  <td>{student.data_nascimento ? calcularIdade(student.data_nascimento) : '-'}</td>
                  <td>{getTurmaLabel(student.turma_id)}</td>
                  <td>{student.nome_responsavel || '-'}</td>
                  <td>{student.geracao || '-'}</td>
                  <td className={styles.actions}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      Ver Ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: '15px', color: 'var(--gray-500)', fontSize: '14px' }}>
          Exibindo {filteredStudents.length} de {students.length} alunos
        </div>
      </div>

      {/* Modal de Ficha Completa */}
      {selectedStudent && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Ficha de Matrícula</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedStudent(null)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Dados do Aluno */}
              <div>
                <h4 style={{ color: 'var(--primary-blue)', marginBottom: '10px', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '5px' }}>
                  Dados do Aluno
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Nome:</span>
                    <p style={{ margin: '5px 0' }}>{selectedStudent.nome}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Data de Nascimento:</span>
                    <p style={{ margin: '5px 0' }}>
                      {selectedStudent.data_nascimento
                        ? new Date(selectedStudent.data_nascimento).toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Idade:</span>
                    <p style={{ margin: '5px 0' }}>
                      {selectedStudent.data_nascimento ? `${calcularIdade(selectedStudent.data_nascimento)} anos` : '-'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>E-mail:</span>
                    <p style={{ margin: '5px 0' }}>{selectedStudent.email || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Turma:</span>
                    <p style={{ margin: '5px 0' }}>{getTurmaLabel(selectedStudent.turma_id)}</p>
                  </div>
                </div>
              </div>

              {/* Dados do Responsável */}
              <div>
                <h4 style={{ color: 'var(--primary-blue)', marginBottom: '10px', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '5px' }}>
                  Dados do Responsável
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Nome:</span>
                    <p style={{ margin: '5px 0' }}>{selectedStudent.nome_responsavel || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Telefone:</span>
                    <p style={{ margin: '5px 0' }}>{selectedStudent.telefone_responsavel || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Dados do Líder */}
              <div>
                <h4 style={{ color: 'var(--primary-blue)', marginBottom: '10px', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '5px' }}>
                  Dados do Líder Direto
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Nome:</span>
                    <p style={{ margin: '5px 0' }}>{selectedStudent.nome_lider_direto || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Geração:</span>
                    <p style={{ margin: '5px 0' }}>{selectedStudent.geracao || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Telefone:</span>
                    <p style={{ margin: '5px 0' }}>{selectedStudent.telefone_lider_direto || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedStudent(null)}
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
