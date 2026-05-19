import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog')

export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  tags: string[]
  author: string
  content: string
  image?: string
  readingTime: number
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 230))
}

function parsePost(slug: string, raw: string): BlogPost {
  const { data, content } = matter(raw)
  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? '',
    excerpt: data.excerpt ?? '',
    tags: data.tags ?? [],
    author: data.author ?? 'PreRoll',
    image: data.image ?? undefined,
    content,
    readingTime: estimateReadingTime(content),
  }
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'))

  return files
    .map((file) => parsePost(file.replace(/\.md$/, ''), fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return undefined
  return parsePost(slug, fs.readFileSync(filePath, 'utf-8'))
}

export function getAllTags(): string[] {
  const tags = new Set<string>()
  for (const post of getAllPosts()) {
    for (const tag of post.tags) tags.add(tag)
  }
  return Array.from(tags).sort()
}

export function getRelatedPosts(current: BlogPost, count = 3): BlogPost[] {
  const all = getAllPosts().filter((p) => p.slug !== current.slug)
  const scored = all.map((post) => {
    const shared = post.tags.filter((t) => current.tags.includes(t)).length
    return { post, score: shared }
  })
  scored.sort((a, b) => b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime())
  return scored.slice(0, count).map((s) => s.post)
}
