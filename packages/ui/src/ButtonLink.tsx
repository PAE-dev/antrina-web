import { type ReactNode } from 'react';

interface ButtonLinkProps {
  href: string;
  /** `primary` solo una vez por vista; el resto de llamadas a la acción son `secondary`. */
  variant?: 'primary' | 'secondary';
  className?: string;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variant = 'secondary',
  className = '',
  children,
}: ButtonLinkProps) {
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <a href={href} className={`${variantClass} ${className}`.trim()}>
      {children}
    </a>
  );
}
