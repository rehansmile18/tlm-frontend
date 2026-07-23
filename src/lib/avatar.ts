// Shared avatar constants/helpers. The actual crop/zoom-to-data-URL work lives in
// components/avatar-crop-dialog.tsx, since it's inherently stateful (pan/zoom UI) rather than a
// pure function.

export const AVATAR_OUTPUT_SIZE = 256; // px, square — the final uploaded image's dimensions
export const AVATAR_MAX_ZOOM = 3;
export const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024; // generous cap on the original picked file

export class AvatarImageError extends Error {}

/** Throws AvatarImageError for a file that clearly can't be used, before we spend effort decoding it. */
export function validateImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new AvatarImageError("File must be an image");
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new AvatarImageError("Image is too large");
  }
}

export function initialsFromEmail(email: string): string {
  const name = email.split("@")[0] ?? email;
  return name.slice(0, 2).toUpperCase();
}
