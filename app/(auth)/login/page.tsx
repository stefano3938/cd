'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/assets/css/login.module.css'
import { useAuth } from '@/lib/auth/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, profile, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redireciona se já estiver logado
  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/professor/chamada')
      }
    }
  }, [authLoading, profile, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        setError('Por favor, preencha todos os campos')
        setLoading(false)
        return
      }

      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        if (signInError.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos')
        } else {
          setError(signInError)
        }
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Mostra loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loginBox}>
          <p style={{ textAlign: 'center' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Sistema de Curso</h1>
        <p className={styles.subtitle}>Capacitação Destino</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
