import { POST as deliveryUploadPost } from '../delivery/upload/route'

// Legacy route — delegates to provider-agnostic delivery routes
export async function POST(
  request: Request,
  context: { params: Promise<{ episodeId: string }> }
) {
  return deliveryUploadPost(request, context)
}
