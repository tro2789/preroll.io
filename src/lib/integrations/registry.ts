import type { IntegrationProvider, IntegrationProviderClient } from './types'

interface ProviderEntry {
  name: IntegrationProvider
  displayName: string
  comingSoon: boolean
  getClient: () => IntegrationProviderClient
}

const providers: Map<IntegrationProvider, ProviderEntry> = new Map()

export function registerProvider(entry: ProviderEntry) {
  providers.set(entry.name, entry)
}

export function getProvider(name: IntegrationProvider): IntegrationProviderClient {
  const entry = providers.get(name)
  if (!entry) throw new Error(`Unknown provider: ${name}`)
  if (entry.comingSoon) throw new Error(`${entry.displayName} integration is not yet available`)
  return entry.getClient()
}

export function getAllProviders(): { name: IntegrationProvider; displayName: string; comingSoon: boolean }[] {
  return Array.from(providers.values()).map(({ name, displayName, comingSoon }) => ({
    name,
    displayName,
    comingSoon,
  }))
}

export function isValidProvider(name: string): name is IntegrationProvider {
  return providers.has(name as IntegrationProvider)
}
