import { registerProvider } from './registry'
import { createFrameIoClient } from './providers/frame-io'
import { createGoogleDriveClient } from './providers/google-drive'

let initialized = false

export function ensureProvidersRegistered() {
  if (initialized) return
  initialized = true

  registerProvider({
    name: 'frame_io',
    displayName: 'Frame.io',
    comingSoon: false,
    getClient: createFrameIoClient,
  })

  registerProvider({
    name: 'google_drive',
    displayName: 'Google Drive',
    comingSoon: false,
    getClient: createGoogleDriveClient,
  })

  registerProvider({
    name: 'vimeo',
    displayName: 'Vimeo',
    comingSoon: true,
    getClient: () => { throw new Error('Vimeo integration is not yet available') },
  })

  registerProvider({
    name: 'dropbox',
    displayName: 'Dropbox',
    comingSoon: true,
    getClient: () => { throw new Error('Dropbox integration is not yet available') },
  })
}
