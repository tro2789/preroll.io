import { verifyInviteToken } from '@/lib/integrations/invite-token'
import { createServiceClient } from '@/lib/supabase/server'
import { YouTubeConnectClient } from './connect-client'
import { ConnectShell } from './connect-shell'

export const metadata = {
  title: 'Connect YouTube Channel',
}

export default async function YouTubeConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; success?: string }>
}) {
  const params = await searchParams

  if (params.success) {
    return (
      <ConnectShell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary">YouTube Connected</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your YouTube channel has been linked. Your producer can now publish episodes directly to your channel.
          </p>
          <p className="mt-4 text-xs text-text-tertiary">You can close this page.</p>
        </div>
      </ConnectShell>
    )
  }

  if (!params.token) {
    return (
      <ConnectShell>
        <ErrorState message="Invalid or missing invite link. Ask your producer for a new link." />
      </ConnectShell>
    )
  }

  const payload = verifyInviteToken(params.token)
  if (!payload) {
    return (
      <ConnectShell>
        <ErrorState message="This link has expired or is invalid. Ask your producer for a new link." />
      </ConnectShell>
    )
  }

  const supabase = createServiceClient()
  const { data: show } = await supabase
    .from('shows')
    .select('name, clients(name)')
    .eq('id', payload.showId)
    .single()

  if (!show) {
    return (
      <ConnectShell>
        <ErrorState message="Show not found. This link may no longer be valid." />
      </ConnectShell>
    )
  }

  const showName = show.name
  const clientName = (show.clients as unknown as { name: string })?.name

  return (
    <ConnectShell>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
          <svg className="h-5 w-5 text-error" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-text-primary">Connect YouTube Channel</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {clientName ? `${clientName} — ` : ''}<span className="font-medium">{showName}</span>
        </p>
        <p className="mt-4 text-sm text-text-secondary">
          Your producer has requested access to publish episodes to your YouTube channel.
          Click below to connect your Google account and select which channel to use.
        </p>

        {params.error && (
          <div className="mt-4 rounded-md bg-error/5 border border-error/30 px-4 py-3">
            <p className="text-sm text-error">{decodeURIComponent(params.error)}</p>
          </div>
        )}

        <YouTubeConnectClient token={params.token} />

        <p className="mt-6 text-xs text-text-tertiary">
          PreRoll.io will only be able to upload videos and manage content on the channel you select.
          You can revoke access at any time from your Google account settings.
        </p>
      </div>
    </ConnectShell>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
        <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-text-primary">Connection Failed</h1>
      <p className="mt-2 text-sm text-text-secondary">{message}</p>
    </div>
  )
}
