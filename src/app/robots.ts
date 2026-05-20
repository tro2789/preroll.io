import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/portal/', '/api/', '/auth/', '/onboarding', '/invite/', '/team/', '/share/', '/login', '/signup'],
      },
    ],
    sitemap: 'https://preroll.io/sitemap.xml',
  }
}
