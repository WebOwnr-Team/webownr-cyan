import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  height?: number | string
  width?: number | string
}

export function Skeleton({ className, height = 16, width = '100%' }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{ height, width }}
      aria-hidden="true"
    />
  )
}

// Pre-built skeleton for a briefing card
export function BriefingCardSkeleton() {
  return (
    <div className="cyan-card p-5 space-y-3">
      <Skeleton height={12} width="40%" />
      <Skeleton height={20} width="70%" />
      <Skeleton height={12} width="90%" />
      <Skeleton height={12} width="60%" />
      <div className="pt-1">
        <Skeleton height={10} width="45%" />
      </div>
    </div>
  )
}

// Pre-built skeleton for a metric card
export function MetricCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton height={11} width="50%" />
      <Skeleton height={28} width="65%" />
      <Skeleton height={11} width="40%" />
    </div>
  )
}
