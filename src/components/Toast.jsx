import React, { useEffect } from "react";

export default function Toast({ message, onDismiss, durationMs = 4500 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => onDismiss?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <div className="app-toast" role="status" aria-live="polite">
      <p className="app-toast-text">{message}</p>
      <button type="button" className="app-toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
