interface ErrorViewProps {
  message: string;
  onRetry: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div className="va-error">
      <span className="va-error-icon">[!]</span>
      <p className="va-error-text">{message}</p>
      <button className="btn btn-primary" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}
