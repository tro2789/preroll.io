import { NextRequest } from 'next/server'
import { GET as deliveryFilesGet } from '../delivery/files/route'

// Legacy route — delegates to provider-agnostic delivery routes
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> }
) {
  return deliveryFilesGet(request, context)
}
