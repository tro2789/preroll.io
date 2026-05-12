'use client'

import type { ReactNode } from 'react'

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const lines = content.split('\n')

  const elements = lines.map((line, i) => {
    if (line.startsWith('### ')) return <h4 key={i} className="text-xs font-semibold text-text-primary mt-3 mb-1">{renderInline(line.slice(4))}</h4>
    if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-semibold text-text-primary mt-3 mb-1">{renderInline(line.slice(3))}</h3>
    if (line.startsWith('# ')) return <h2 key={i} className="text-sm font-bold text-text-primary mt-3 mb-1">{renderInline(line.slice(2))}</h2>

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
          <span className="shrink-0 text-text-tertiary">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    }

    const numberedMatch = line.match(/^(\d+)\.\s(.+)/)
    if (numberedMatch) {
      return (
        <div key={i} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
          <span className="shrink-0 text-text-tertiary w-4 text-right">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      )
    }

    if (!line.trim()) return <div key={i} className="h-2" />

    return <p key={i} className="text-xs text-text-secondary leading-relaxed">{renderInline(line)}</p>
  })

  return <div className={className}>{elements}</div>
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-medium text-text-primary">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
