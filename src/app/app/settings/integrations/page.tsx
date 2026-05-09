import { redirect } from 'next/navigation'

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const query = new URLSearchParams(params).toString()
  redirect(`/app/settings/developer${query ? `?${query}` : ''}`)
}
