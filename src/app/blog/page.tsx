import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog — PreRoll.io',
  description: 'Tips on podcast production, workflow automation, and growing your podcast business.',
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.02em] mb-2">Blog</h1>
        <p className="text-text-secondary mb-12">Tips on podcast production, workflow automation, and growing your podcast business.</p>

        {posts.length === 0 ? (
          <p className="text-text-secondary">No posts yet. Check back soon.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <time className="text-xs text-text-tertiary">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                  <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors mt-1">{post.title}</h2>
                  {post.excerpt && <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{post.excerpt}</p>}
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
