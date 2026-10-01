'use client'

import { useEffect, useState } from 'react'
import styles from '@/assets/css/admin.module.css'
import { User } from '@/lib/supabase/types'

type UserRole = 'admin' | 'professor' | 'monitor'

interface FormData {
  nome: string
  email: string
  data_nascimento: string
  nome_lider_direto: string
  geracao: string
  telefone_lider_direto: string
  role: UserRole
  password: string
}

const initialFormData: FormData = {
  nome: '',
  email: '',
  data_nascimento: '',
  nome_lider_direto: '',
  geracao: '',
  telefone_lider_direto: '',
  role: 'professor',
  password: ''
}

export default function CadastroUsuarios() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setSuccess('Usuário cadastrado com sucesso!')
        setFormData(initialFormData)
        setShowModal(false)
        loadUsers()
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao cadastrar usuário')
      }
    } catch {
      setError('Erro ao cadastrar usuário')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadUsers()
      }
    } catch (e) {
      console.error(e)
    }
  }

  function getRoleLabel(role: string) {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      professor: 'Professor',
      monitor: 'Monitor'
    }
    return labels[role] || role
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Cadastro de Usuários</h2>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowModal(true)}
          >
            Novo Usuário
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>Nenhum usuário cadastrado</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tipo</th>
                <th>Geração</th>
                <th>Líder Direto</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.nome}</td>
                  <td>{user.email}</td>
                  <td>{getRoleLabel(user.role)}</td>
                  <td>{user.geracao || '-'}</td>
                  <td>{user.nome_lider_direto || '-'}</td>
                  <td className={styles.actions}>
                    <button
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDelete(user.id)}
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
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Novo Usuário</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tipo de Usuário *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={styles.select}
                  required
                >
                  <option value="professor">Professor</option>
                  <option value="monitor">Monitor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

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

              <div className={styles.formGroup}>
                <label className={styles.label}>Senha *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.input}
                  required
                  minLength={6}
                />
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
                  {saving ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
