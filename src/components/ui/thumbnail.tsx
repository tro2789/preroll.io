import Image from 'next/image'
import { getGradient } from '@/lib/ui/gradient'

interface ThumbnailProps {
  id: string
  imageUrl: string | null | undefined
  className?: string
}

export function Thumbnail({ id, imageUrl, className = '' }: ThumbnailProps) {
  if (imageUrl) {
    return (
      <div className={`relative overflow-hidden rounded-md ${className}`}>
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-md ${className}`}
      style={{ background: getGradient(id) }}
    />
  )
}
