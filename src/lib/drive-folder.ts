/**
 * Extract a Google Drive folder ID from a pasted URL or raw ID.
 * Accepts:
 * - https://drive.google.com/drive/folders/{id}
 * - https://drive.google.com/drive/u/0/folders/{id}?usp=sharing
 * - https://drive.google.com/open?id={id}
 * - raw folder ID
 */
export function parseDriveFolderId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const folderMatch = value.match(
    /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|open\?id=)([a-zA-Z0-9_-]+)/,
  );
  if (folderMatch?.[1]) return folderMatch[1];

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) return value;

  return null;
}
