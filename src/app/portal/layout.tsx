import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalHeader } from '@/components/portal/portal-header'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('client_user_id', user.id)
    .single()

  if (!client) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-surface-base overflow-x-hidden">
      <PortalHeader clientName={client.name} email={user.email ?? ''} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
