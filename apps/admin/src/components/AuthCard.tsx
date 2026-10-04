import { Logo } from '@antrina/ui';
import { type ReactNode } from 'react';

interface AuthCardProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

/** Marco de las pantallas de acceso: centrado, mucho aire y sin distracciones. */
export function AuthCard({ eyebrow, title, children }: AuthCardProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-16">
      <div className="flex w-full max-w-[420px] flex-col gap-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <Logo href="/login" label="Antrina" />
          <div className="flex flex-col items-center gap-3">
            <p className="type-eyebrow">{eyebrow}</p>
            <h1 className="type-h2">{title}</h1>
            <span className="accent-rule" />
          </div>
        </div>
        <div className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6 md:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
