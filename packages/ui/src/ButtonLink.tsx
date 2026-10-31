import { buttonVariants } from '@heroui/react';
import { type ReactNode } from 'react';
import { ArrowRightIcon } from './icons';

interface ButtonLinkProps {
  href: string;
  /**
   * `primary` (azul marino) solo una vez por vista; `secondary` con contorno marino; `inverse`
   * sobre bloques azul marino.
   */
  variant?: 'primary' | 'secondary' | 'inverse';
  withArrow?: boolean;
  /** Abre en otra pestaña (WhatsApp, enlaces fuera de la tienda). */
  external?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASS = {
  primary: buttonVariants({ variant: 'primary', size: 'lg' }),
  secondary: `${buttonVariants({ variant: 'outline', size: 'lg' })} border-[1.5px] border-text bg-transparent text-text hover:bg-text hover:text-on-dark`,
  inverse: `${buttonVariants({ variant: 'outline', size: 'lg' })} border-[1.5px] border-on-dark text-on-dark hover:bg-on-dark hover:text-text`,
};

/** Enlace de texto subrayado con flecha: acción terciaria ("Ver todos", "Crea tu árbol"). */
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2 text-[15px] font-medium text-clay-strong underline decoration-clay/50 underline-offset-[6px] transition-colors hover:decoration-current"
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
  external = false,
  className = '',
  children,
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${VARIANT_CLASS[variant]} group/btn h-12 px-7 text-[15px] font-medium md:h-12 ${className}`.trim()}
    >
      {children}
      {withArrow && (
        <ArrowRightIcon className="transition-transform duration-300 group-hover/btn:translate-x-0.5" />
      )}
    </a>
  );
}
