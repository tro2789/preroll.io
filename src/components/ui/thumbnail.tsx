import { getGradient } from '@/lib/ui/gradient'

interface ThumbnailProps {
  id: string
  imageUrl: string | null | undefined
  className?: string
}

export function Thumbnail({ id, imageUrl, className = '' }: ThumbnailProps) {
  if (imageUrl) {
    return (
      <div className={`overflow-hidden rounded-md ${className}`}>
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
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
