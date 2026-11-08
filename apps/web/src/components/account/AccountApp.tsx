import { type LocaleCode, type MyOrderDto, type SkyDataResponse } from '@antrina/contracts';
import { ArrowLink, ButtonLink, formatMoney, SectionIndex } from '@antrina/ui';
import { useEffect, useState } from 'react';
import { accountApi, googleLoginUrl, logout, useAccount } from '../../lib/account';
import { Avatar, GoogleMark } from './AccountChip';

const COPY = {
  es: {
    label: 'Tu cuenta',
    title: 'Mi cuenta',
    intro:
      'Entra con Google y guarda tu cielo, tus vínculos y tus compras. Una sola sesión para el bosque, cada mundo y Tu cielo.',
    google: 'Continuar con Google',
    soon: 'El acceso con Google estará disponible muy pronto.',
    error: 'No pudimos completar el acceso. Inténtalo otra vez.',
    benefits: [
      'Tu carta y tu guía diaria en cualquier dispositivo',
      'Tus preguntas al cielo y tus vínculos guardados',
      'Tus compras en un solo lugar',
    ],
    privacy: 'Solo usamos tu nombre, tu correo y tu foto de Google. Nunca publicamos nada.',
    signOut: 'Cerrar sesión',
    sky: 'Tu cielo',
    skyEmpty: 'Aún no creaste tu carta.',
    skyCreate: 'Crear mi carta',
    skyOpen: 'Abrir Tu cielo',
    born: 'Naciste el',
    at: 'a las',
    in: 'en',
    questions: 'preguntas guardadas',
    bonds: 'vínculos guardados',
    orders: 'Mis compras',
    ordersEmpty:
      'Aún no vemos compras con este correo. Si compraste por WhatsApp con otro correo, escríbenos y las unimos.',
    shop: 'Ver la colección',
    order: 'Pedido',
    status: {
      PENDING: 'Pendiente',
      PAID: 'Pagado',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
    },
  },
  en: {
    label: 'Your account',
    title: 'My account',
    intro:
      'Sign in with Google to save your sky, your bonds and your purchases. One session for the forest, every world and Your sky.',
    google: 'Continue with Google',
    soon: 'Google sign-in is coming very soon.',
    error: 'We could not complete the sign-in. Please try again.',
    benefits: [
      'Your chart and daily guide on any device',
      'Your questions and bonds, saved',
      'All your purchases in one place',
    ],
    privacy: 'We only use your Google name, email and photo. We never post anything.',
    signOut: 'Sign out',
    sky: 'Your sky',
    skyEmpty: 'You have not created your chart yet.',
    skyCreate: 'Create my chart',
    skyOpen: 'Open Your sky',
    born: 'Born on',
    at: 'at',
    in: 'in',
    questions: 'saved questions',
    bonds: 'saved bonds',
    orders: 'My purchases',
    ordersEmpty:
      'We do not see purchases with this email yet. If you ordered on WhatsApp with another email, message us and we will link them.',
    shop: 'See the collection',
    order: 'Order',
    status: {
      PENDING: 'Pending',
      PAID: 'Paid',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    },
  },
} as const;

function formatDay(iso: string, locale: LocaleCode): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "Mi cuenta": entrar con Google, Tu cielo guardado y compras. */
export function AccountApp({
  locale,
  skyHref,
  catalogHref,
}: {
  locale: LocaleCode;
  skyHref: string;
  catalogHref: string;
}) {
  const t = COPY[locale];
  const { status, account, googleEnabled } = useAccount();
  const [sky, setSky] = useState<SkyDataResponse | null>(null);
  const [orders, setOrders] = useState<MyOrderDto[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(new URLSearchParams(window.location.search).get('login') === 'error');
  }, []);

  useEffect(() => {
    if (!account) return;
    void accountApi
      .sky()
      .then(setSky)
      .catch(() => setSky(null));
    void accountApi
      .orders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [account]);

  return (
    <section className="section">
      <div className="container-page flex flex-col gap-10">
        <div className="flex flex-col gap-5">
          <SectionIndex label={t.label} />
          <h1 className="type-h1">{t.title}</h1>
        </div>

        {status === 'loading' && (
          <div className="h-40 max-w-xl animate-pulse rounded-md bg-bg-alt" aria-hidden="true" />
        )}

        {status === 'ready' && !account && (
          <div className="flex max-w-xl flex-col gap-6">
            <p className="type-body">{t.intro}</p>
            {failed && (
              <p className="type-meta rounded-md border border-border-strong px-4 py-3">
                {t.error}
              </p>
            )}
            {googleEnabled ? (
              <a
                href={googleLoginUrl()}
                className="inline-flex h-12 w-fit items-center gap-3 rounded-full border-[1.5px] border-text bg-surface px-6 text-[15px] font-medium text-text transition-colors hover:bg-bg-alt"
              >
                <GoogleMark />
                {t.google}
              </a>
            ) : (
              <p className="type-meta">{t.soon}</p>
            )}
            <ul className="flex flex-col gap-3">
              {t.benefits.map((line) => (
                <li key={line} className="type-body flex items-center gap-3">
                  <span className="rombo" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="type-meta">{t.privacy}</p>
          </div>
        )}

        {account && (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 rounded-md bg-bg-alt p-5">
                <span className="rounded-full bg-brand">
                  <Avatar name={account.name} url={account.avatarUrl} size={56} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-medium">{account.name}</p>
                  <p className="type-meta truncate">{account.email}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-md border border-border p-5">
                <p className="type-label">{t.sky}</p>
                {sky?.profile ? (
                  <>
                    <p className="type-body">
                      {t.born} {formatDay(sky.profile.birthDate, locale)}
                      {sky.profile.birthTime ? ` ${t.at} ${sky.profile.birthTime}` : ''}
                      {sky.profile.place ? ` ${t.in} ${sky.profile.place.name}` : ''}.
                    </p>
                    <p className="type-meta">
                      {sky.questions.length} {t.questions} · {sky.bonds.length} {t.bonds}
                    </p>
                    <ButtonLink href={skyHref} variant="primary" withArrow className="mt-2 w-fit">
                      {t.skyOpen}
                    </ButtonLink>
                  </>
                ) : (
                  <>
                    <p className="type-body">{t.skyEmpty}</p>
                    <ButtonLink href={skyHref} variant="primary" withArrow className="mt-2 w-fit">
                      {t.skyCreate}
                    </ButtonLink>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => void logout()}
                className="type-meta w-fit underline underline-offset-4"
              >
                {t.signOut}
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="type-h3 font-display">{t.orders}</h2>
              {orders === null && (
                <div className="h-28 animate-pulse rounded-md bg-bg-alt" aria-hidden="true" />
              )}
              {orders?.length === 0 && (
                <div className="flex flex-col gap-4">
                  <p className="type-body text-text-secondary">{t.ordersEmpty}</p>
                  <ArrowLink href={catalogHref}>{t.shop}</ArrowLink>
                </div>
              )}
              {orders?.map((order) => (
                <article
                  key={order.number}
                  className="flex flex-col gap-3 border-t border-border pt-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {t.order} #{order.number}
                    </p>
                    <p className="type-meta">
                      {formatDay(order.soldAt, locale)} · {t.status[order.status]}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {order.lines.map((line, i) => (
                      <li key={i} className="type-meta flex justify-between gap-4">
                        <span>
                          {line.quantity} × {line.name}
                        </span>
                        <span className="type-price">{formatMoney(line.unitPrice, locale)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="type-price text-right">{formatMoney(order.total, locale)}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
