/** Reusable skeleton loaders for all API-driven screens. */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function MovieCardSkeleton() {
  return (
    <div className="poster-card" style={{ pointerEvents: 'none' }}>
      <div className="poster-card-image">
        <Skeleton className="skeleton-poster" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="poster-card-body">
        <Skeleton className="skeleton-text" style={{ width: '75%', marginBottom: 6 }} />
        <Skeleton className="skeleton-text-sm" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

export function MovieGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="movie-grid">
      {Array.from({ length: count }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="movie-hero" style={{ background: 'var(--color-bg-elevated)' }}>
      <div className="hero-content">
        <div className="hero-poster" style={{ background: 'var(--color-surface)' }}>
          <Skeleton className="skeleton-poster" style={{ width: '100%' }} />
        </div>
        <div className="hero-info" style={{ flex: 1 }}>
          <Skeleton className="skeleton-text-sm" style={{ width: 120, marginBottom: 12 }} />
          <Skeleton className="skeleton-text-lg" style={{ width: '60%', marginBottom: 8 }} />
          <Skeleton className="skeleton-text-lg" style={{ width: '40%', marginBottom: 16 }} />
          <Skeleton className="skeleton-text" style={{ width: '80%', marginBottom: 6 }} />
          <Skeleton className="skeleton-text" style={{ width: '65%', marginBottom: 24 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Skeleton style={{ width: 130, height: 40, borderRadius: 8 }} />
            <Skeleton style={{ width: 120, height: 40, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShowCardSkeleton() {
  return (
    <div className="show-card" style={{ pointerEvents: 'none' }}>
      <Skeleton className="skeleton-text-lg" style={{ width: '60%', marginBottom: 8 }} />
      <div style={{ padding: 12, background: 'var(--color-surface)', borderRadius: 8 }}>
        <Skeleton className="skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
        <Skeleton className="skeleton-text" style={{ width: '60%', marginBottom: 8 }} />
        <Skeleton className="skeleton-text" style={{ width: '50%' }} />
      </div>
      <Skeleton style={{ width: 100, height: 36, borderRadius: 8, marginTop: 8 }} />
    </div>
  );
}

export function TheatreCardSkeleton() {
  return (
    <div className="theatre-card" style={{ pointerEvents: 'none' }}>
      <Skeleton className="skeleton-text-lg" style={{ width: '50%', marginBottom: 8 }} />
      <Skeleton className="skeleton-text" style={{ width: '40%', marginBottom: 8 }} />
      <Skeleton className="skeleton-text-sm" style={{ width: '30%', marginBottom: 16 }} />
      <Skeleton style={{ width: 100, height: 36, borderRadius: 8 }} />
    </div>
  );
}

export function SeatMapSkeleton() {
  return (
    <div className="seat-map" style={{ minHeight: 300 }}>
      <div className="screen" style={{ opacity: 0.3 }}>
        <span>SCREEN</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: 10 }, (_, j) => (
              <Skeleton key={j} style={{ width: 34, height: 34, borderRadius: '7px 7px 4px 4px' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
