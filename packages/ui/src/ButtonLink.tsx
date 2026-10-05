import { buttonVariants } from '@heroui/react';
import { type ReactNode } from 'react';
import { ArrowRightIcon } from './icons';

interface ButtonLinkProps {
  href: string;
  /**
   * `primary` (amatista) solo una vez por vista; `secondary` con contorno; `inverse` sobre
   * bloques carbón.
   */
  variant?: 'primary' | 'secondary' | 'inverse';
  withArrow?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASS = {
  primary: buttonVariants({ variant: 'primary', size: 'lg' }),
  secondary: `${buttonVariants({ variant: 'outline', size: 'lg' })} border-border-strong text-text`,
  inverse: `${buttonVariants({ variant: 'outline', size: 'lg' })} border-border-dark text-on-dark hover:bg-on-dark hover:text-text`,
};

/** Enlace de texto subrayado con flecha: acción terciaria ("Ver todos", "Crea tu árbol"). */
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] underline decoration-border-strong underline-offset-[6px] transition-colors hover:decoration-current"
    >
      {children}
      <ArrowRightIcon className="transition-transform duration-300 group-hover:translate-x-0.5" />
    </a>
  );
}

export function ButtonLink({
  href,
  variant = 'secondary',
  withArrow = false,
  className = '',
  children,
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={`${VARIANT_CLASS[variant]} group/btn h-12 px-6 text-[15px] tracking-[-0.01em] md:h-12 ${className}`.trim()}
    >
      {children}
      {withArrow && (
        <ArrowRightIcon className="transition-transform duration-300 group-hover/btn:translate-x-0.5" />
      )}
    </a>
  );
}
