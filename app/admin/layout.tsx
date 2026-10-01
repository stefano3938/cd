import AdminLayout from '@/components/admin/AdminLayout'

// Montado uma única vez para toda a área /admin: ao navegar pelo menu só o conteúdo troca,
// sem recarregar o menu nem consultar a sessão de novo.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
