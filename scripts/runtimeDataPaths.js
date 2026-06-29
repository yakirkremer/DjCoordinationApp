/** Paths that hold runtime data — never commit or deploy from local machine. */
export const RUNTIME_DATA_PATHS = [
  "public/data/catalog.json",
  "public/data/clients.json",
  "public/data/feedback.json",
  "public/data/form-schema.json",
  "public/data/app-settings.json",
];

/** Local-only assets — never push via deploy (use Render disk + backup export). */
export const DEPLOY_EXCLUDE_PATHS = [
  ...RUNTIME_DATA_PATHS,
  "public/data/artwork",
  "public/music",
  "public/tmp_music",
  "kramer-backup-2026-06-29.tar.gz",
];
