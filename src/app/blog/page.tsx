import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { LogoIcon } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tips on podcast production, workflow automation, and growing your podcast business.',
  alternates: { canonical: 'https://preroll.io/blog' },
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

function FeaturedPost({ post }: { post: ReturnType<typeof getAllPosts>[0] }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="relative overflow-hidden rounded-[16px] border border-border-default bg-surface-raised p-8 sm:p-10 transition-all hover:border-border-hover hover:shadow-[0_20px_60px_-20px_oklch(0.05_0_0/0.6)]">
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'radial-gradient(80% 60% at 80% 0%, oklch(0.715 0.155 40 / 0.12), transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">Latest</span>
            <span className="h-px flex-1 bg-border-subtle" />
            <span className="text-xs text-text-tertiary">{formatDate(post.date)}</span>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(22px,2.8vw,32px)] font-semibold text-text-primary leading-[1.2] tracking-[-0.02em] group-hover:text-accent transition-colors">
            {post.title}
          </h2>
          <p className="text-text-secondary mt-3 text-[16px] leading-relaxed max-w-[60ch]">
            {post.excerpt}
          </p>
          <div className="flex items-center gap-4 mt-5">
            <span className="text-sm text-text-secondary">{post.author}</span>
            <span className="text-text-tertiary">&middot;</span>
            <span className="text-sm text-text-tertiary">{post.readingTime} min read</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

function PostCard({ post }: { post: ReturnType<typeof getAllPosts>[0] }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="h-full rounded-[12px] border border-border-default bg-surface-raised p-6 transition-all hover:border-border-hover hover:shadow-[0_12px_40px_-12px_oklch(0.05_0_0/0.5)] flex flex-col">
        <time className="text-xs text-text-tertiary font-mono">{formatDate(post.date)}</time>
        <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-text-primary leading-[1.3] tracking-[-0.01em] mt-2.5 group-hover:text-accent transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed line-clamp-3 flex-1">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
          <div className="flex gap-2 flex-wrap">
            {post.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[11px] font-medium text-accent bg-accent-tint px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <span className="text-xs text-text-tertiary">{post.readingTime} min</span>
        </div>
      </article>
    </Link>
  )
}

export default function BlogIndex() {
  const posts = getAllPosts()
  const [featured, ...rest] = posts

  return (
    <div className="min-h-screen bg-surface-base">
      <Nav />

      <main className="max-w-[1200px] mx-auto px-7 py-16">
        <header className="mb-12">
          <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">Blog</span>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(28px,3.4vw,40px)] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mt-3">
            Production insights
          </h1>
          <p className="text-text-secondary mt-3 text-[17px] leading-relaxed max-w-[52ch]">
            Practical guides on podcast production, workflow automation, and scaling your agency.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-text-secondary">No posts yet. Check back soon.</p>
        ) : (
          <>
            {featured && <FeaturedPost post={featured} />}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </>
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
