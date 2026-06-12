import { useState, useCallback } from 'react'
import { cn } from '@/shared/lib/utils'

interface UserAvatarProps {
  avatarUrl?: string
  displayName: string
  className?: string
}

export function UserAvatar({ avatarUrl, displayName, className }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const initial = displayName.trim().charAt(0).toUpperCase()
  const handleError = useCallback(() => setImgFailed(true), [])

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        loading="lazy"
        className={cn('shrink-0', className)}
        onError={handleError}
      />
    )
  }

  return (
    <span
      className={cn(
        'shrink-0 flex items-center justify-center bg-primary/10 text-primary font-semibold select-none',
        className,
      )}
    >
      {initial}
    </span>
  )
}
