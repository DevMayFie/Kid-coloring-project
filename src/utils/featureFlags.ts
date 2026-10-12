/**
 * Client-side feature flags.
 * Photo-to-line-art is OFF by default unless VITE_ENABLE_PHOTO_TO_LINE_ART === 'true'.
 */
export const isPhotoToLineArtEnabled: boolean =
  import.meta.env.VITE_ENABLE_PHOTO_TO_LINE_ART === 'true';
