import { ChannelPicker } from './channel-picker'
import { ConnectShell } from '../connect-shell'

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
      <ConnectShell>
        <p className="text-sm text-text-secondary text-center">Invalid request. Please try again from the invite link.</p>
      </ConnectShell>
    )
  }

  let state: {
    inviteToken: string
    showId: string
    orgId: string
    channels: { id: string; name: string }[]
  }

  try {
    state = JSON.parse(Buffer.from(params.state, 'base64url').toString())
  } catch {
    return (
      <ConnectShell>
        <p className="text-sm text-text-secondary text-center">Invalid state. Please try again from the invite link.</p>
      </ConnectShell>
    )
  }

  return (
    <ConnectShell>
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
    </ConnectShell>
  )
}
