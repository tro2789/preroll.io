'use client'

import type { EpisodeTag } from '@/lib/kanban/types'

export function CardTagPills({ tags }: { tags: EpisodeTag[] }) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none"
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
          }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  )
}
