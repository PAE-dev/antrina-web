import { type LocaleCode } from '@antrina/contracts';
import { useEffect, useRef, useState } from 'react';
import { googleLoginUrl, logout, useAccount } from '../../lib/account';

const COPY = {
  es: {
    signIn: 'Entrar',
    account: 'Mi cuenta',
    signOut: 'Cerrar sesión',
    menu: 'Menú de tu cuenta',
  },
  en: { signIn: 'Sign in', account: 'My account', signOut: 'Sign out', menu: 'Your account menu' },
} as const;

/** Logo de Google (marca oficial, colores requeridos por sus pautas). */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function Avatar({
  name,
  url,
  size = 32,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white/15 font-medium text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || '·'}
    </span>
  );
}

/**
 * Acceso a la cuenta sobre fondos oscuros (bosque, mundos, Tu cielo): "Entrar" con Google o el
 * avatar con un menú. La sesión es la misma en todo el sitio.
 */
export function AccountChip({
  locale,
  accountHref,
  className = '',
}: {
  locale: LocaleCode;
  accountHref: string;
  className?: string;
}) {
  const t = COPY[locale];
  const { status, account, googleEnabled } = useAccount();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (status === 'loading' || (!account && !googleEnabled)) return null;

  if (!account) {
    return (
      <a
        href={googleLoginUrl()}
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3.5 py-2 text-[13px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/55 ${className}`}
      >
        <GoogleMark size={16} />
        {t.signIn}
      </a>
    );
  }

  return (
    <div
      ref={box}
      className={`pointer-events-auto ${className.includes('absolute') ? '' : 'relative'} ${className}`}
    >
      <button
        type="button"
        aria-label={t.menu}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-black/35 p-1 pr-3 text-[13px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/55"
      >
        <Avatar name={account.name} url={account.avatarUrl} size={28} />
        <span className="max-w-[9rem] truncate">{account.name.split(' ')[0]}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-white/15 bg-[#0e0e10]/95 text-white shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-[14px] font-medium">{account.name}</p>
            <p className="truncate text-[12px] text-white/55">{account.email}</p>
          </div>
          <a href={accountHref} className="block px-4 py-3 text-[14px] hover:bg-white/5">
            {t.account}
          </a>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="block w-full px-4 py-3 text-left text-[14px] text-white/70 hover:bg-white/5"
          >
            {t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
