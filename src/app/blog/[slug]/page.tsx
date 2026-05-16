import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import { remark } from 'remark'
import html from 'remark-html'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: `${post.title} — PreRoll.io`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      ...(post.image && { images: [{ url: post.image }] }),
    },
  }
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const rendered = await remark().use(html).process(post.content)
  const contentHtml = rendered.toString()

  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <article className="max-w-3xl mx-auto px-6 py-24">
        <Link href="/blog" className="text-sm text-text-secondary hover:text-text-primary transition-colors mb-8 inline-block">&larr; Back to blog</Link>

        <header className="mb-10">
          <time className="text-xs text-text-tertiary">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.02em] mt-2">{post.title}</h1>
          {post.tags.length > 0 && (
            <div className="flex gap-2 mt-3">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs font-medium text-accent">{tag}</span>
              ))}
            </div>
          )}
        </header>

        {/* Content sourced from trusted local markdown files, not user input */}
        <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </article>
    </main>
  )
}
