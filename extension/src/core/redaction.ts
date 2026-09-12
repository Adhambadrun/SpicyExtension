/** Best-effort text safeguards, not a substitute for the agent's review. */
export function redactText(value: string): string {
  return value
    // Intentional removal of non-printing control characters; preserve tabs/newlines.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, '[redacted URL]')
    .replace(/\bBearer\s+[^\s<>"']+/gi, '[redacted credential]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted token]')
    .replace(/\b(?:password|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|session[_ -]?token)\s*[:=]\s*[^\s<>"']+/gi, '[redacted credential]');
}

export function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
