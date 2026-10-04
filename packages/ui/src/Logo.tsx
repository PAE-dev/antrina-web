interface LogoProps {
  href: string;
  label: string;
  isCompact?: boolean;
}

export function Logo({ href, label, isCompact = false }: LogoProps) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex items-center gap-2.5 text-brand transition-[gap] duration-300"
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-[width,height] duration-300 ${isCompact ? 'size-6' : 'size-7 md:size-8'}`}
      >
        <path d="M9 26h14l-1.5 3.5h-11z" />
        <path d="M16 26c0-5-3-7-3-11s3-5 3-8.5" />
        <path d="M13.6 18c-2.5-.4-4.5-2-5.3-4.3" />
        <path d="M15.4 11.5c2.5-.4 4.5-2 5.3-4.3" />
        <circle cx="7" cy="11" r="2.6" />
        <circle cx="22.5" cy="5" r="2.6" />
        <circle cx="15.5" cy="4" r="2" />
      </svg>
      <span
        className={`font-display font-medium leading-none tracking-[0.04em] transition-[font-size] duration-300 ${
          isCompact ? 'text-[26px]' : 'text-[28px] md:text-[34px]'
        }`}
      >
        Antrina
      </span>
    </a>
  );
}
