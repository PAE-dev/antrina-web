import { Link } from 'react-router';

/** Marca del panel: monograma + nombre en Geist, sin la tipografía editorial de la tienda. */
export function BrandMark({
  to = '/productos',
  tone = 'light',
}: {
  to?: string;
  /** `dark` sobre las barras azul marino. */
  tone?: 'light' | 'dark';
}) {
  const isDark = tone === 'dark';
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-md" aria-label="Antrina · Panel">
      <span
        className={`flex size-7 items-center justify-center rounded-md text-on-dark ${isDark ? 'bg-clay' : 'bg-brand'}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2 19 9l-7 13L5 9l7-7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M5 9h14" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={`text-[15px] font-semibold tracking-[-0.02em] ${isDark ? 'text-on-dark' : 'text-text'}`}
        >
          Antrina
        </span>
        <span
          className={`text-[12px] font-medium ${isDark ? 'text-on-dark-muted' : 'text-text-muted'}`}
        >
          Admin
        </span>
      </span>
    </Link>
  );
}
