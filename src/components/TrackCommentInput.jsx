import React from "react";

export default function TrackCommentInput({ value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder="NOTE..."
      maxLength={120}
      className="input-luxury font-lcd w-full sm:w-48 px-2 py-1 text-[10px] uppercase tracking-wide rounded placeholder:text-xdj-muted/50"
      dir="ltr"
    />
  );
}
