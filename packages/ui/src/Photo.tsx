import { PhotoPlaceholder } from './PhotoPlaceholder';
import { type ImageSource } from './types';

interface PhotoProps {
  image?: ImageSource;
  /** Texto del hueco mientras no haya foto. */
  label: string;
  /** Clase de proporción de Tailwind, p. ej. `aspect-[4/5]`. */
  aspect?: string;
  className?: string;
  /** Foto principal de la vista (LCP): carga inmediata y prioridad alta. */
  priority?: boolean;
}

/** Foto real si existe; si no, el hueco `PhotoPlaceholder`. */
export function Photo({
  image,
  label,
  aspect = 'aspect-[4/5]',
  className = '',
  priority = false,
}: PhotoProps) {
  if (!image) return <PhotoPlaceholder label={label} aspect={aspect} className={className} />;
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={image.sizes}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={`w-full rounded-md bg-bg-alt object-cover ${aspect} ${className}`.trim()}
    />
  );
}
