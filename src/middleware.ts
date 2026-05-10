import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  request.headers.set('x-url', request.url)
  return await updateSession(request)
}

export const config = {
  matcher: ['/app/:path*', '/portal/:path*'],
}
