import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  request.headers.set('x-url', request.url)
  const response = await updateSession(request)

  if (request.nextUrl.pathname.startsWith('/portal')) {
    const previewId = request.nextUrl.searchParams.get('preview')
    if (previewId) {
      response.cookies.set('portal_preview_client_id', previewId, {
        path: '/',
        maxAge: 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
      })
    }
  }

  return response
}

export const config = {
  matcher: ['/app/:path*', '/portal/:path*', '/admin/:path*'],
}
