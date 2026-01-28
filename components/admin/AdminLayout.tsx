'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from '@/assets/css/admin.module.css'
import { useAuth } from '@/lib/auth/AuthContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, loading, signOut, isAdmin } = useAuth()

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login')
      return
    }
    if (!loading && !isAdmin) {
      router.push('/professor/chamada')
      return
    }
  }, [loading, profile, isAdmin, router])

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
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

  if (loading || !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Carregando...
      </div>
    )
  }

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
            <span className={styles.userName}>{profile.nome}</span>
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
