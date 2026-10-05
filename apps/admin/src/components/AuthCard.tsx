import { type ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { IconShield } from './icons';

interface AuthCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Marco de las pantallas de acceso. */
export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-5 py-12">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <BrandMark to="/login" />
        <div className="panel-card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-text">
              {title}
            </h1>
            {description && (
              <p className="text-[13.5px] leading-5 text-text-secondary">{description}</p>
            )}
          </div>
          {children}
        </div>
        <p className="flex items-center gap-1.5 text-[12px] text-text-muted">
          <IconShield size={14} />
          Acceso restringido con verificación en dos pasos.
        </p>
      </div>
    </main>
  );
}
