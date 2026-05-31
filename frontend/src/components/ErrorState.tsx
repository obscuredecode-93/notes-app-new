import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Something went wrong. Check your connection and try again.',
  onRetry,
}: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full py-16 px-6 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle
        className="w-10 h-10 text-danger mb-3"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-text-pri mb-1">Failed to load</p>
      <p className="text-xs text-text-sec mb-4 max-w-xs leading-relaxed">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-xs bg-bg-surface border border-border-col rounded-lg text-text-sec hover:text-text-pri hover:border-text-faint transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
