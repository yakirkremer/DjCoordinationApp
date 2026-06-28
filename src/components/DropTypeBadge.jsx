import React from "react";
import { getDropTypeStyle } from "../lib/dropTypeColors";

export default function DropTypeBadge({ drop, compact = false, className = "", title }) {
  const label = String(drop ?? "").trim();
  if (!label) return null;

  return (
    <span
      className={`drop-type-badge ${compact ? "is-compact" : ""} ${className}`}
      style={getDropTypeStyle(label)}
      title={title || label}
    >
      <span className="drop-type-badge-dot" aria-hidden />
      <span className="drop-type-badge-label">{label}</span>
    </span>
  );
}
