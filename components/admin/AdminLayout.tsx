'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from '@/assets/css/admin.module.css'

interface User {
  id: string
  nome: string
  role: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // O middleware já bloqueia quem não é admin; aqui só buscamos os dados para exibir
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data) {
          router.replace('/login')
          return
        }
        if (data.role !== 'admin') {
          router.replace('/professor/chamada')
          return
        }
        setUser(data)
      })
      .catch(() => router.replace('/login'))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/usuarios', label: 'Cadastro de Usuários' },
    { href: '/admin/matriculas', label: 'Matrículas' },
    { href: '/admin/chamadas', label: 'Caderneta de Chamadas' },
    { href: '/admin/frequencia', label: 'Controle de Frequência' },
    { href: '/admin/consulta-cadastros', label: 'Consulta de Cadastros' },
    { href: '/admin/consulta-turmas', label: 'Consulta de Turmas' },
  ]

  if (!user) return null

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Capacitação</div>
        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>
            {navItems.find(i => i.href === pathname)?.label || 'Admin'}
          </h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.nome}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Sair
            </button>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
