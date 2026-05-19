import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug, getRelatedPosts } from '@/lib/blog'
import { remark } from 'remark'
import html from 'remark-html'
import { LogoIcon } from '@/components/ui/logo'

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
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `https://preroll.io/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      url: `https://preroll.io/blog/${slug}`,
      ...(post.image && { images: [{ url: post.image }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      ...(post.image && { images: [post.image] }),
    },
  }
}

function blogPostJsonLd(post: { title: string; date: string; excerpt: string; slug: string; image?: string; author: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: 'PreRoll.io', url: 'https://preroll.io' },
    url: `https://preroll.io/blog/${post.slug}`,
    ...(post.image && { image: post.image }),
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function Nav() {
  return (
    <nav className="border-b border-border-subtle bg-surface-base/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-7 h-[60px] max-w-[1200px] mx-auto px-7">
        <Link href="/" className="flex items-center gap-2.5 font-[family-name:var(--font-display)] font-bold text-[16.5px] tracking-[-0.02em]">
          <span className="w-[26px] h-[26px] rounded-[7px] grid place-items-center text-sm font-bold shadow-[0_4px_14px_-4px_oklch(0.715_0.155_40/0.6)]" style={{ background: 'linear-gradient(150deg, var(--color-accent), oklch(0.62 0.16 18))', color: 'white' }}>
            <LogoIcon className="w-[15px] h-[15px]" />
          </span>
          <span className="text-text-primary">PreRoll<span className="text-accent">.io</span></span>
        </Link>
        <div className="hidden sm:flex gap-1 ml-2">
          {[
            ['Product', '/#features'],
            ['Docs', '/docs'],
            ['Blog', '/blog'],
          ].map(([label, href]) => (
            <Link key={label} href={href} className={`px-[11px] py-[7px] rounded-[6px] text-sm font-[450] transition-colors ${label === 'Blog' ? 'text-text-primary bg-surface-raised' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'}`}>
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto">
          <Link href="/signup" className="inline-flex items-center gap-2 px-4 py-2 rounded-[7px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors">
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  )
}

function RelatedPost({ post }: { post: ReturnType<typeof getAllPosts>[0] }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="rounded-[12px] border border-border-default bg-surface-raised p-5 transition-all hover:border-border-hover hover:shadow-[0_12px_40px_-12px_oklch(0.05_0_0/0.5)]">
        <time className="text-xs text-text-tertiary font-mono">{formatDate(post.date)}</time>
        <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-text-primary leading-[1.3] mt-2 group-hover:text-accent transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-text-secondary mt-1.5 leading-relaxed line-clamp-2">{post.excerpt}</p>
        <span className="text-xs text-text-tertiary mt-2.5 block">{post.readingTime} min read</span>
      </article>
    </Link>
  )
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const rendered = await remark().use(html).process(post.content)
  const contentHtml = rendered.toString()
  const related = getRelatedPosts(post)

  return (
    <div className="min-h-screen bg-surface-base">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostJsonLd(post)) }} />
      <Nav />

      <main className="max-w-[680px] mx-auto px-7 pt-14 pb-20">
        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          All posts
        </Link>

        <article>
          {/* Header */}
          <header className="mb-10">
            <div className="flex gap-2 mb-4 flex-wrap">
              {post.tags.map((tag) => (
                <span key={tag} className="text-[11px] font-medium text-accent bg-accent-tint px-2.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(26px,3.6vw,38px)] font-semibold text-text-primary leading-[1.18] tracking-[-0.022em]">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border-subtle">
              <div className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold" style={{ background: 'linear-gradient(150deg, var(--color-accent), oklch(0.62 0.16 18))', color: 'white' }}>
                {post.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{post.author}</p>
                <p className="text-xs text-text-tertiary">
                  {formatDate(post.date)} &middot; {post.readingTime} min read
                </p>
              </div>
            </div>
          </header>

          {/* Body */}
          {/* Content sourced from trusted local markdown files, not user input */}
          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </article>

        {/* CTA */}
        <div className="mt-14 rounded-[12px] border border-border-default bg-surface-raised p-7 text-center">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
            Ready to streamline your podcast production?
          </p>
          <p className="text-sm text-text-secondary mt-1.5">
            Free for 7 days. No card required.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors mt-4">
            Start free trial
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary mb-5">
              Related articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((rp) => (
                <RelatedPost key={rp.slug} post={rp} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border-subtle py-8 px-7">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between text-[12.5px] text-fg-faint">
          <span>&copy; {new Date().getFullYear()} PreRoll.io</span>
          <div className="flex gap-5">
            <Link href="/docs" className="hover:text-text-secondary transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-text-secondary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-text-secondary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
