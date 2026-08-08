interface LoadingProps {
  label?: string;
}
export function LoadingState({ label = 'Loading…' }: LoadingProps) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
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
      <strong>{title}</strong>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
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
    <div className="state state-empty" role="status">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}