const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function exportBasename(input: string) {
  const trimmed = input
    .trim()
    .replace(/\.(xlsx|docx|csv|zip)$/i, "")
    .replace(/\.+$/g, "")
    .trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(trimmed)) return null;
  if (reserved.test(trimmed)) return null;
  return trimmed;
}

export function exportFilenameError(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "Enter a filename.";
  if (trimmed.length > 80) return "Filename must be 80 characters or fewer.";
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(trimmed)) {
    return 'Filename can\'t include \\ / : * ? " < > |.';
  }
  if (!exportBasename(trimmed)) return "Choose a different filename.";
  return null;
}

export function exportPasswordError(password: string) {
  if (!password) return "Enter a password.";
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  return null;
}

export function suggestedExportFilename(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  return exportBasename(cleaned) ?? "payments";
}
