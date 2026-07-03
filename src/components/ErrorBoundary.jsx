import React from "react";

/**
 * Catches render and lifecycle errors in child components.
 * Does not modify app data — only shows a fallback UI and optional retry.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(
      this.props.label ? `[ErrorBoundary: ${this.props.label}]` : "[ErrorBoundary]",
      error,
      info.componentStack
    );
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props;
    if (!this.state.error || !resetKeys) return;

    const prev = prevProps.resetKeys ?? [];
    const changed =
      resetKeys.length !== prev.length ||
      resetKeys.some((key, index) => key !== prev[index]);

    if (changed) this.reset();
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === "function") {
      return this.props.fallback({ error, reset: this.reset });
    }

    return (
      <DefaultErrorFallback
        error={error}
        onRetry={this.reset}
        title={this.props.title}
        message={this.props.message}
        retryLabel={this.props.retryLabel}
        refreshLabel={this.props.refreshLabel}
        showDetails={this.props.showDetails}
      />
    );
  }
}

function DefaultErrorFallback({
  error,
  onRetry,
  title = "Something went wrong",
  message = "This section failed to load. You can try again or refresh the page.",
  retryLabel = "Try again",
  refreshLabel = "Refresh page",
  showDetails = import.meta.env.DEV,
}) {
  return (
    <section
      className="panel-luxury rounded-sm p-8 text-center max-w-md mx-auto space-y-4"
      role="alert"
    >
      <h2 className="text-lg font-semibold text-xdj-gold">{title}</h2>
      <p className="text-sm text-xdj-muted">{message}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          className="btn-luxury-primary px-5 py-2.5 rounded-sm text-sm min-h-[44px]"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
        <button
          type="button"
          className="btn-luxury px-5 py-2.5 rounded-sm text-sm min-h-[44px]"
          onClick={() => window.location.reload()}
        >
          {refreshLabel}
        </button>
      </div>
      {showDetails && error?.message ? (
        <pre className="text-left text-xs text-xdj-muted/80 overflow-auto max-h-32 p-3 rounded-sm bg-black/20">
          {error.message}
        </pre>
      ) : null}
    </section>
  );
}
