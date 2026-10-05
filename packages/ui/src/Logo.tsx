interface LogoProps {
  href: string;
  label: string;
  /** `dark` para fondos carbón (pie de página). */
  tone?: 'light' | 'dark';
}

export function Logo({ href, label, tone = 'light' }: LogoProps) {
  return (
    <a
      href={href}
      aria-label={label}
      className={`inline-flex items-center gap-2 ${tone === 'dark' ? 'text-on-dark' : 'text-text'}`}
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-7 ${tone === 'dark' ? 'text-quartz' : 'text-brand'}`}
      >
        <path d="M9 26h14l-1.5 3.5h-11z" />
        <path d="M16 26c0-5-3-7-3-11s3-5 3-8.5" />
        <path d="M13.6 18c-2.5-.4-4.5-2-5.3-4.3" />
        <path d="M15.4 11.5c2.5-.4 4.5-2 5.3-4.3" />
        <circle cx="7" cy="11" r="2.6" />
        <circle cx="22.5" cy="5" r="2.6" />
        <circle cx="15.5" cy="4" r="2" />
      </svg>
      <span className="font-display text-[23px] font-semibold leading-none tracking-[-0.045em] [font-variation-settings:'opsz'_48]">
        Antrina
      </span>
    </a>
  );
}
