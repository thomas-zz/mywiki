export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: 'var(--border)' }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="py-2.5">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function SectionSkeleton() {
  return (
    <div className="border rounded-[10px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <Skeleton className="h-4 w-40 mb-4" />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

export function PageSkeleton({ sections = 4 }: { sections?: number }) {
  return (
    <div>
      <Skeleton className="h-7 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: sections }, (_, i) => <SectionSkeleton key={i} />)}
      </div>
    </div>
  )
}
