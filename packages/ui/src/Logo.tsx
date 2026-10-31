interface LogoProps {
  href: string;
  label: string;
  /** `dark` para fondos azul marino (pie de página): usa el logo en negativo. */
  tone?: 'light' | 'dark';
  className?: string;
}

/** Logo oficial (símbolo + nombre). Archivos en `apps/web/public/brand/`. */
export function Logo({ href, label, tone = 'light', className = 'h-11 md:h-12' }: LogoProps) {
  return (
    <a href={href} aria-label={label} className="inline-flex shrink-0 items-center">
      <img
        src={tone === 'dark' ? '/brand/antrina-logo-negativo.svg' : '/brand/antrina-logo.svg'}
        alt=""
        width={1000}
        height={300}
        className={`w-auto ${className}`.trim()}
      />
    </a>
  );
}
