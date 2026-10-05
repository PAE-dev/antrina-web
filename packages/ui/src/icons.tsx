import { type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** Iconografía de línea fina: trazo 1.5 y color heredado (text por defecto). */
const base: IconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const SearchIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);

export const BagIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 8h14l-1 13H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base} width={14} height={14} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...base} width={16} height={16} {...props}>
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </svg>
);

export const ArrowUpRightIcon = (props: IconProps) => (
  <svg {...base} width={16} height={16} {...props}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 9h16M4 15h16" />
  </svg>
);

export const HandIcon = (props: IconProps) => (
  <svg {...base} width={28} height={28} {...props}>
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v7" />
    <path d="M8 12.5 6.6 11a1.6 1.6 0 0 0-2.4 2.1L8 18.5A6 6 0 0 0 12.8 21H14a5 5 0 0 0 5-5v-5a1.5 1.5 0 0 0-2-1.4" />
  </svg>
);

export const StoneIcon = (props: IconProps) => (
  <svg {...base} width={28} height={28} {...props}>
    <path d="M7 4h10l4 6-9 11L3 10l4-6Z" />
    <path d="M3 10h18M9.5 4 8 10l4 11 4-11-1.5-6" />
  </svg>
);

export const TreeIcon = (props: IconProps) => (
  <svg {...base} width={28} height={28} {...props}>
    <path d="M7 20h10l-1.2 2H8.2z" />
    <path d="M12 20c0-4-2-5.5-2-8.5S12 7.5 12 5" />
    <path d="M10.3 13.5C8.5 13.2 7 12 6.3 10.3" />
    <path d="M11.6 8.5c1.8-.3 3.3-1.5 4-3.2" />
    <circle cx="5.5" cy="8.5" r="2" />
    <circle cx="17" cy="4" r="2" />
    <circle cx="12" cy="3" r="1.5" />
  </svg>
);

export const InstagramIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17 7h.01" />
  </svg>
);

export const FacebookIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14.5 8H17V4.5h-2.5C11.9 4.5 10.5 6 10.5 8.6V11H8v3.5h2.5v6h3.5v-6h2.6l.4-3.5h-3V9c0-.6.4-1 1-1Z" />
  </svg>
);

export const WhatsAppIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 20l1.2-3.8A8.3 8.3 0 1 1 8 19l-4 1Z" />
    <path d="M9 8.8c0 3.3 2.9 6.2 6.2 6.2l1.3-1.6-2-1-1 .9c-1-.4-2.4-1.8-2.8-2.8l.9-1-1-2L9 8.8Z" />
  </svg>
);
