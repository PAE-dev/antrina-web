import { Link } from 'react-router';

/** Marca del panel: monograma + nombre en Geist, sin la tipografía editorial de la tienda. */
export function BrandMark({ to = '/productos' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-md" aria-label="Antrina · Panel">
      <span className="flex size-7 items-center justify-center rounded-md bg-brand text-surface">
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
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-text">Antrina</span>
        <span className="text-[12px] font-medium text-text-muted">Admin</span>
      </span>
    </Link>
  );
}
