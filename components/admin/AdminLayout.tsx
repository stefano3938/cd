'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from '@/assets/css/admin.module.css'
<<<<<<< HEAD
import { useAuth } from '@/lib/auth/AuthContext'
=======
import ChangePasswordModal from '@/components/ChangePasswordModal'

interface User {
  id: string
  nome: string
  email: string
  role: string
}
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
<<<<<<< HEAD
  const { profile, loading, signOut, isAdmin } = useAuth()
=======
  const [user, setUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300

  // A fonte da verdade é a sessão no servidor; localStorage serve só para exibir o nome
  useEffect(() => {
<<<<<<< HEAD
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
=======
    async function checkSession() {
      const res = await fetch('/api/auth/session').catch(() => null)
      if (!res || !res.ok) {
        localStorage.removeItem('user')
        router.push('/login')
        return
      }
      const session = await res.json()
      if (session.role !== 'admin') {
        router.push('/professor/chamada')
        return
      }
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      setUser({ ...stored, id: session.id, nome: session.nome, role: session.role })
    }
    checkSession()
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('user')
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300
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
    { href: '/admin/lgpd', label: 'LGPD e Segurança' },
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
<<<<<<< HEAD
            <span className={styles.userName}>{profile.nome}</span>
=======
            <span className={styles.userName}>{user.nome}</span>
            <button onClick={() => setShowPassword(true)} className={styles.logoutBtn}>
              Alterar senha
            </button>
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Sair
            </button>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  )
}
