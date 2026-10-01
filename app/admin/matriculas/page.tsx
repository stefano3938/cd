'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from '@/assets/css/admin.module.css'
import { Student, Turma } from '@/lib/supabase/types'
import { calcularIdade, isMenor } from '@/lib/lgpd/config'

interface FormData {
  nome: string
  data_nascimento: string
  email: string
  nome_responsavel: string
  telefone_responsavel: string
  nome_lider_direto: string
  geracao: string
  telefone_lider_direto: string
  turma_id: string
  consentimento_titular: '' | 'aluno' | 'responsavel'
  consentimento_confirmado: boolean
}

const initialFormData: FormData = {
  nome: '',
  data_nascimento: '',
  email: '',
  nome_responsavel: '',
  telefone_responsavel: '',
  nome_lider_direto: '',
  geracao: '',
  telefone_lider_direto: '',
  turma_id: '',
  consentimento_titular: '',
  consentimento_confirmado: false
}

export default function Matriculas() {
  const [students, setStudents] = useState<Student[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value } as FormData
      // Menor de idade: consentimento obrigatoriamente do responsável (LGPD art. 14)
      if (name === 'data_nascimento' && isMenor(value)) next.consentimento_titular = 'responsavel'
      return next
    })
  }

  const menor = isMenor(formData.data_nascimento)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.consentimento_confirmado || !formData.consentimento_titular) {
      setError('Registre o consentimento para concluir a matrícula')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setSuccess('Aluno matriculado com sucesso!')
        setFormData(initialFormData)
        setShowModal(false)
        loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao matricular aluno')
      }
    } catch {
      setError('Erro ao matricular aluno')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta matrícula?')) return

    try {
      const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      }
    } catch (e) {
      console.error(e)
    }
  }

  function getTurmaLabel(turmaId: string): string {
    const turma = turmas.find(t => t.id === turmaId)
    return turma ? `${turma.nome} - ${turma.horario_inicio}` : '-'
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Matrículas de Alunos</h2>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowModal(true)}
          >
            Nova Matrícula
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : students.length === 0 ? (
          <div className={styles.empty}>Nenhum aluno matriculado</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Idade</th>
                <th>Responsável</th>
                <th>Turma</th>
                <th>Geração</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>{student.nome}</td>
                  <td>{student.data_nascimento ? calcularIdade(student.data_nascimento) : '-'}</td>
                  <td>{student.nome_responsavel || '-'}</td>
                  <td>{getTurmaLabel(student.turma_id)}</td>
                  <td>{student.geracao || '-'}</td>
                  <td className={styles.actions}>
                    <button
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDelete(student.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Nova Matrícula</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Data de Nascimento *</label>
                  <input
                    type="date"
                    name="data_nascimento"
                    value={formData.data_nascimento}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Idade</label>
                  <input
                    type="text"
                    value={formData.data_nascimento ? `${calcularIdade(formData.data_nascimento)} anos` : '-'}
                    className={styles.input}
                    disabled
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nome do Responsável *</label>
                <input
                  type="text"
                  name="nome_responsavel"
                  value={formData.nome_responsavel}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Telefone do Responsável *</label>
                  <input
                    type="tel"
                    name="telefone_responsavel"
                    value={formData.telefone_responsavel}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>E-mail *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nome do Líder Direto *</label>
                <input
                  type="text"
                  name="nome_lider_direto"
                  value={formData.nome_lider_direto}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Geração *</label>
                  <input
                    type="text"
                    name="geracao"
                    value={formData.geracao}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Telefone do Líder *</label>
                  <input
                    type="tel"
                    name="telefone_lider_direto"
                    value={formData.telefone_lider_direto}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Turma (Horário) *</label>
                <select
                  name="turma_id"
                  value={formData.turma_id}
                  onChange={handleChange}
                  className={styles.select}
                  required
                >
                  <option value="">Selecione uma turma</option>
                  {turmas.map(turma => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.horario_inicio}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className={styles.consentBox}>
                <legend className={styles.label}>Consentimento (LGPD) *</legend>
                <p className={styles.consentText}>
                  O titular (ou o responsável, se menor de 18 anos) leu o{' '}
                  <Link href="/privacidade" target="_blank" rel="noopener noreferrer">Aviso de Privacidade</Link>{' '}
                  e autorizou o uso dos dados para o curso.
                </p>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Quem autorizou</label>
                  <select
                    name="consentimento_titular"
                    value={formData.consentimento_titular}
                    onChange={handleChange}
                    className={styles.select}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="aluno" disabled={menor}>O próprio aluno (maior de idade)</option>
                    <option value="responsavel">O responsável</option>
                  </select>
                  {menor && <small className={styles.consentText}>Aluno menor de idade: exige autorização do responsável.</small>}
                </div>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.consentimento_confirmado}
                    onChange={e => setFormData(prev => ({ ...prev, consentimento_confirmado: e.target.checked }))}
                  />
                  Confirmo que o consentimento foi obtido
                </label>
              </fieldset>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Matricular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
