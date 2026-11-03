import SmartToyIcon from '~icons/material-symbols/smart-toy'
import { cn } from '@copas/ui'

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function BrandLogo({ size = 'md', showText = true, className }: BrandLogoProps) {
  const containerSize = {
    sm: 'size-6 rounded-md',
    md: 'size-7 rounded-lg',
    lg: 'size-9 rounded-xl',
  }[size]

  const iconSize = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
  }[size]

  const textSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size]

  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-xs',
          containerSize,
        )}
      >
        <SmartToyIcon className={cn('shrink-0', iconSize)} />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight text-foreground whitespace-nowrap', textSize)}>
          CoPAS
        </span>
      )}
    </div>
  )
}
