'use client'

import type { ReactNode } from 'react'

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-xs font-semibold text-text-primary mt-3 mb-1">{renderInline(line.slice(4))}</h4>)
      i++
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-text-primary mt-3 mb-1">{renderInline(line.slice(3))}</h3>)
      i++
      continue
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-sm font-bold text-text-primary mt-3 mb-1">{renderInline(line.slice(2))}</h2>)
      i++
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: { key: number; text: string }[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push({ key: i, text: lines[i].slice(2) })
        i++
      }
      elements.push(
        <ul key={`ul-${items[0].key}`} className="space-y-0.5 my-1" role="list">
          {items.map(item => (
            <li key={item.key} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
              <span className="shrink-0 text-text-tertiary" aria-hidden="true">•</span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    const numberedMatch = line.match(/^(\d+)\.\s(.+)/)
    if (numberedMatch) {
      const items: { key: number; num: string; text: string }[] = []
      let j = i
      while (j < lines.length) {
        const m = lines[j].match(/^(\d+)\.\s(.+)/)
        if (!m) break
        items.push({ key: j, num: m[1], text: m[2] })
        j++
      }
      elements.push(
        <ol key={`ol-${items[0].key}`} className="space-y-0.5 my-1" role="list">
          {items.map(item => (
            <li key={item.key} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
              <span className="shrink-0 text-text-tertiary w-4 text-right" aria-hidden="true">{item.num}.</span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      )
      i = j
      continue
    }

    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" aria-hidden="true" />)
      i++
      continue
    }

    elements.push(<p key={i} className="text-xs text-text-secondary leading-relaxed">{renderInline(line)}</p>)
    i++
  }

  return <div className={className}>{elements}</div>
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-medium text-text-primary">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">{linkMatch[1]}</a>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-surface-overlay px-1 py-0.5 text-text-primary">{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}
