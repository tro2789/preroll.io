import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/portal/', '/api/', '/onboarding', '/invite/', '/team/', '/share/'],
      },
    ],
    sitemap: 'https://preroll.io/sitemap.xml',
  }
}
