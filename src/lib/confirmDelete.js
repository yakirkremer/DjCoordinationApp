/**
 * @param {string} message
 * @returns {boolean} true if the user confirmed
 */
export function confirmDeleteAction(message) {
  if (!message?.trim()) return false;
  return window.confirm(message);
}
