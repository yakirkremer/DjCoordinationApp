import React from "react";
import { useI18n } from "../lib/i18n/AppSettingsContext";
import { formatTrackArtist } from "../lib/trackArtist";

export default function TrackArtistName({ artist, className, title, ...props }) {
  const { locale } = useI18n();
  const label = formatTrackArtist(artist, locale);

  return (
    <span className={className} title={title ?? (artist && artist !== label ? artist : undefined)} {...props}>
      {label}
    </span>
  );
}
