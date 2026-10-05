interface PhotoPlaceholderProps {
  label: string;
  /** Clase de proporción de Tailwind, p. ej. `aspect-[4/5]`. */
  aspect?: string;
  className?: string;
}

/**
 * Hueco para fotografía real (luz natural, fondos piedra o ambientes reales).
 * Nunca sustituir por ilustraciones genéricas ni recortes sobre blanco.
 */
export function PhotoPlaceholder({
  label,
  aspect = 'aspect-[4/5]',
  className = '',
}: PhotoPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`photo-placeholder w-full ${aspect} ${className}`.trim()}
    >
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
