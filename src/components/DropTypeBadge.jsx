import React from "react";
import { useDropColors } from "../hooks/useDropColors";

export default function DropTypeBadge({ drop, compact = false, className = "", title }) {
  const { getStyle } = useDropColors();
  const label = String(drop ?? "").trim();
  if (!label) return null;

  return (
    <span
      className={`drop-type-badge ${compact ? "is-compact" : ""} ${className}`}
      style={getStyle(label)}
      title={title || label}
    >
      <span className="drop-type-badge-dot" aria-hidden />
      <span className="drop-type-badge-label">{label}</span>
    </span>
  );
}
