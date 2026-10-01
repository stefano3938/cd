'use client'

import { useEffect, useState } from 'react'
import { formatarData } from '@/lib/datas'
import styles from '@/assets/css/admin.module.css'
import { Student, Turma } from '@/lib/supabase/types'
import { calcularIdade, isMenor } from '@/lib/lgpd/config'

export default function ConsultaCadastros() {
  const [students, setStudents] = useState<Student[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTurma, setFilterTurma] = useState('')
  const [fichaError, setFichaError] = useState('')
  const [consentTitular, setConsentTitular] = useState<'' | 'aluno' | 'responsavel'>('')
  const [consentConfirmado, setConsentConfirmado] = useState(false)
  const [savingConsent, setSavingConsent] = useState(false)

  // Carrega a ficha pelo servidor para que a visualização fique registrada na auditoria
  async function openFicha(id: string) {
    setFichaError('')
    setConsentConfirmado(false)
    const res = await fetch(`/api/admin/students/${id}`)
    const data = await res.json()
    if (!res.ok) {
      setFichaError(data.error || 'Erro ao carregar ficha')
      return
    }
    setConsentTitular(isMenor(data.data_nascimento) ? 'responsavel' : '')
    setSelectedStudent(data)
  }

  async function registrarConsentimento() {
    if (!selectedStudent) return
    setSavingConsent(true)
    setFichaError('')
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.id}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentimento_titular: consentTitular, consentimento_confirmado: consentConfirmado })
      })
      const data = await res.json()
      if (!res.ok) {
        setFichaError(data.error || 'Erro ao registrar consentimento')
        return
      }
      const updated = { ...selectedStudent, ...data }
      setSelectedStudent(updated)
      setStudents(prev => prev.map(s => (s.id === updated.id ? { ...s, ...data } : s)))
    } finally {
      setSavingConsent(false)
    }
  }

  async function exportarDados() {
    if (!selectedStudent) return
    const res = await fetch(`/api/admin/students/${selectedStudent.id}/export`)
    if (!res.ok) {
      setFichaError('Erro ao exportar dados')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dados-aluno-${selectedStudent.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function consentBadge(student: Student) {
    if (student.anonimizado_em) return <span className={`${styles.badge} ${styles.badgeMuted}`}>Anonimizado</span>
    if (student.consentimento_em) return <span className={`${styles.badge} ${styles.badgeOk}`}>Registrado</span>
    return <span className={`${styles.badge} ${styles.badgeWarning}`}>Pendente</span>
  }

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
    <>
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
                <th>Consentimento</th>
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
                  <td>{consentBadge(student)}</td>
                  <td className={styles.actions}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={() => openFicha(student.id)}
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
                        ? formatarData(selectedStudent.data_nascimento)
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

              {/* LGPD */}
              <div>
                <h4 style={{ color: 'var(--primary-blue)', marginBottom: '10px', borderBottom: '2px solid var(--primary-blue)', paddingBottom: '5px' }}>
                  Privacidade (LGPD)
                </h4>
                {fichaError && <div className={styles.error}>{fichaError}</div>}

                {selectedStudent.anonimizado_em ? (
                  <p className={styles.consentText}>
                    Dados anonimizados em {new Date(selectedStudent.anonimizado_em).toLocaleDateString('pt-BR')}.
                  </p>
                ) : selectedStudent.consentimento_em ? (
                  <p className={styles.consentText}>
                    {consentBadge(selectedStudent)}{' '}
                    Consentimento do {selectedStudent.consentimento_titular === 'responsavel' ? 'responsável' : 'aluno'} em{' '}
                    {new Date(selectedStudent.consentimento_em).toLocaleDateString('pt-BR')} (aviso versão {selectedStudent.consentimento_versao}).
                  </p>
                ) : (
                  <div className={styles.consentBox}>
                    <p className={styles.consentText}>
                      {consentBadge(selectedStudent)} Nenhum consentimento registrado para este aluno.
                    </p>
                    <select
                      className={styles.select}
                      value={consentTitular}
                      onChange={e => setConsentTitular(e.target.value as '' | 'aluno' | 'responsavel')}
                    >
                      <option value="">Quem autorizou?</option>
                      <option value="aluno" disabled={isMenor(selectedStudent.data_nascimento)}>O próprio aluno (maior de idade)</option>
                      <option value="responsavel">O responsável</option>
                    </select>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" checked={consentConfirmado} onChange={e => setConsentConfirmado(e.target.checked)} />
                      Confirmo que o consentimento foi obtido conforme o Aviso de Privacidade
                    </label>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={registrarConsentimento}
                      disabled={savingConsent || !consentTitular || !consentConfirmado}
                    >
                      {savingConsent ? 'Salvando...' : 'Registrar consentimento'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              {!selectedStudent.anonimizado_em && (
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={exportarDados}>
                  Exportar dados (JSON)
                </button>
              )}
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
    </>
  )
}
