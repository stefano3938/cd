'use client'

import { FormEvent, useState } from 'react'
import styles from '@/assets/css/password.module.css'

const MIN_PASSWORD_LENGTH = 8

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (novaSenha.length < MIN_PASSWORD_LENGTH) {
      setError(`A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`)
      return
    }
    if (novaSenha !== confirmacao) {
      setError('A confirmação não confere com a nova senha')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Erro ao alterar senha')
        return
      }
      setSuccess(true)
    } catch {
      setError('Erro ao alterar senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <h3 className={styles.title}>Alterar senha</h3>

        {success ? (
          <>
            <p className={styles.success}>
              Senha alterada. As sessões abertas em outros dispositivos foram encerradas.
            </p>
            <button className={styles.primary} onClick={onClose}>Fechar</button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <label className={styles.label}>
              Senha atual
              <input type="password" className={styles.input} value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} autoComplete="current-password" required />
            </label>
            <label className={styles.label}>
              Nova senha (mín. {MIN_PASSWORD_LENGTH} caracteres)
              <input type="password" className={styles.input} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" required />
            </label>
            <label className={styles.label}>
              Confirme a nova senha
              <input type="password" className={styles.input} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} autoComplete="new-password" required />
            </label>

            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={onClose}>Cancelar</button>
              <button type="submit" className={styles.primary} disabled={saving}>
                {saving ? 'Salvando...' : 'Alterar senha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
