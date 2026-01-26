'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import styles from '@/assets/css/admin.module.css'

interface Stats {
  cursos: number
  turmas: number
  professores: number
  alunos: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ cursos: 0, turmas: 0, professores: 0, alunos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [cursos, turmas, profs, alunos] = await Promise.all([
          fetch('/api/admin/courses').then(r => r.json()),
          fetch('/api/admin/turmas').then(r => r.json()),
          fetch('/api/admin/professors').then(r => r.json()),
          fetch('/api/admin/students').then(r => r.json())
        ])
        setStats({
          cursos: cursos.length || 0,
          turmas: turmas.length || 0,
          professores: profs.length || 0,
          alunos: alunos.length || 0
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <AdminLayout>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.cursos}</div>
            <div className={styles.statLabel}>Cursos</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.turmas}</div>
            <div className={styles.statLabel}>Turmas</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.professores}</div>
            <div className={styles.statLabel}>Professores</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.alunos}</div>
            <div className={styles.statLabel}>Alunos</div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
