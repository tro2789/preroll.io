import { NextRequest } from 'next/server'
import { GET as deliveryGet, POST as deliveryPost } from '../delivery/route'

// Legacy route — delegates to provider-agnostic delivery routes
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> }
) {
  return deliveryGet(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ episodeId: string }> }
) {
  return deliveryPost(request, context)
}
