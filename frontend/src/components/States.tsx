interface LoadingProps {
  label?: string;
}
export function LoadingState({ label = 'Loading…' }: LoadingProps) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
    </div>
  );
}

interface ErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorProps) {
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon">!</div>
      <strong>{title}</strong>
      <p>{message}</p>
      {onRetry ? (
        <div className="state-action">
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try Again
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface EmptyProps {
  title?: string;
  message: string;
}
export function EmptyState({
  title = 'Nothing here yet',
  message,
}: EmptyProps) {
  return (
    <div className="state" role="status">
      <div className="state-icon" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>—</div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}