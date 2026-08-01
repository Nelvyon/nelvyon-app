import { libraryPhotos, type LibraryPhotoId } from "../content/visualLibrary";

/**
 * premium stock library photo with AVIF → WebP → JPG fallback (native picture).
 * Parent must be `position: relative` when using fill (default).
 */
export function LibraryPhoto({
  id,
  alt,
  className = "object-cover",
  priority = false,
}: {
  id: LibraryPhotoId;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const photo = libraryPhotos[id];
  const resolvedAlt = alt ?? photo.alt;

  return (
    <picture className="absolute inset-0 block h-full w-full">
      <source srcSet={photo.avif} type="image/avif" />
      <source srcSet={photo.webp} type="image/webp" />
      <img
        src={photo.jpg}
        alt={resolvedAlt}
        className={`h-full w-full ${className}`.trim()}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
