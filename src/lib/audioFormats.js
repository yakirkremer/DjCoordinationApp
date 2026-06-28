export const ACCEPT_AUDIO =
  ".mp3,.wav,audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav";

export function isSupportedAudioFile(file) {
  const name = file?.name?.toLowerCase() ?? "";
  return name.endsWith(".mp3") || name.endsWith(".wav");
}

export function stripAudioExtension(name) {
  return name.replace(/\.(mp3|wav)$/i, "");
}
