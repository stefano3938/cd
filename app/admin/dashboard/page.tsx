'use client'

import { useEffect, useState } from 'react'
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
        const res = await fetch('/api/admin/stats')
        if (res.ok) setStats(await res.json())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <>
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
    </>
  )
}
