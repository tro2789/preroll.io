import { ChannelPicker } from './channel-picker'

export const metadata = {
  title: 'Select YouTube Channel',
}

export default async function PickChannelPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const params = await searchParams

  if (!params.state) {
    return (
      <Shell>
        <p className="text-sm text-text-secondary text-center">Invalid request. Please try again from the invite link.</p>
      </Shell>
    )
  }

  let state: {
    inviteToken: string
    showId: string
    orgId: string
    accessToken: string
    refreshToken?: string
    expiresIn?: number
    channels: { id: string; name: string }[]
  }

  try {
    state = JSON.parse(Buffer.from(params.state, 'base64url').toString())
  } catch {
    return (
      <Shell>
        <p className="text-sm text-text-secondary text-center">Invalid state. Please try again from the invite link.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="text-center">
        <h1 className="text-xl font-bold text-text-primary">Select a Channel</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Choose which YouTube channel to connect for episode publishing.
        </p>
      </div>
      <ChannelPicker
        channels={state.channels}
        stateParam={params.state}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-surface-raised p-8 shadow-lg">
        {children}
        <div className="mt-8 border-t border-border-subtle pt-4 text-center">
          <p className="text-xs text-text-tertiary">Powered by PreRoll.io</p>
        </div>
      </div>
    </div>
  )
}
