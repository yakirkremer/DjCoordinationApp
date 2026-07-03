const FALLBACK_DELETE_MESSAGE = "Are you sure you want to delete this?";

/** @type {((message: string) => Promise<boolean>) | null} */
let confirmHandler = null;

export function registerConfirmDeleteHandler(handler) {
  confirmHandler = handler;
}

/**
 * @param {string} message
 * @returns {Promise<boolean>} true if the user confirmed
 */
export async function confirmDeleteAction(message) {
  const text = message?.trim() || FALLBACK_DELETE_MESSAGE;
  if (confirmHandler) return confirmHandler(text);
  return window.confirm(text);
}
