import {
  CUSTOMER_AUTH_ROUTES,
  TORITO_ROUTES,
  type ToritoDto,
  type ToritoListResponse,
} from '@antrina/contracts';
import { ButtonLink, Emphasis, GoogleIcon } from '@antrina/ui';
import { useEffect, useRef, useState } from 'react';
import { EstabloStable } from './EstabloStable';
import { toritoRequest } from './toritos-api';
import {
  clearPendingClaim,
  exampleCollection,
  exampleTorito,
  type OwnedTorito,
  ownedFromDto,
  ownedFromPending,
  readPendingClaim,
} from './toritos';
import { ToritoSprite } from './ToritoSprite';

const WALK_MS = 7600;
const ESTABLO_PATH = '/establo';

interface Props {
  assetsPath: string;
  customerName: string | null;
  /** Mirar el establo sin haber iniciado sesión. */
  isPreview: boolean;
  /** Enseña una colección inventada de este tamaño, para probar el establo con muchos toritos. */
  exampleCount: number | null;
  /** Pieza del torito que acaba de nacer. */
  newToritoId: string | null;
  authError: string | null;
  accountHref: string;
}

const googleHref = `${CUSTOMER_AUTH_ROUTES.googleStart}?next=${encodeURIComponent(ESTABLO_PATH)}`;

function GoogleButton({ label }: { label: string }) {
  return (
    <ButtonLink
      href={googleHref}
      variant="inverse"
      className="w-full bg-on-dark text-text hover:opacity-90"
    >
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface">
        <GoogleIcon />
      </span>
      {label}
    </ButtonLink>
  );
}

export function EstabloExperience({
  assetsPath,
  customerName,
  isPreview,
  exampleCount,
  newToritoId,
  authError,
  accountHref,
}: Props) {
  const [toritos, setToritos] = useState<OwnedTorito[] | null>(null);
  const [pending, setPending] = useState<OwnedTorito | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);

  useEffect(() => {
    if (exampleCount) {
      setToritos(exampleCollection(exampleCount));
      return;
    }
    const claim = readPendingClaim();
    if (!customerName) {
      setPending(claim ? ownedFromPending(claim) : null);
      setToritos([]);
      return;
    }
    const load = async () => {
      // Vuelve de iniciar sesión con un torito por guardar.
      if (claim) {
        try {
          const torito = await toritoRequest<ToritoDto>(
            'POST',
            TORITO_ROUTES.pieceClaim(claim.code),
            {
              name: claim.name,
              colorCode: claim.colorCode,
              intention: claim.intention,
            },
          );
          setClaimedId(torito.id);
        } catch (failure) {
          setClaimError(failure instanceof Error ? failure.message : 'No pudimos guardarlo.');
        }
        clearPendingClaim();
      }
      const { data } = await toritoRequest<ToritoListResponse>('GET', TORITO_ROUTES.toritos);
      setToritos(data.map(ownedFromDto));
    };
    load().catch((failure: unknown) => {
      setLoadError(failure instanceof Error ? failure.message : 'No pudimos abrir tu establo.');
      setToritos([]);
    });
  }, [customerName, exampleCount]);

  if (!customerName && !isPreview && !exampleCount) {
    // Espera a leer el navegador para no enseñar un torito de ejemplo y cambiarlo enseguida.
    if (!toritos) return <main className="surface-dark min-h-svh" />;
    return <SavePrompt assetsPath={assetsPath} pending={pending} authError={authError} />;
  }
  return (
    <Stable
      assetsPath={assetsPath}
      customerName={customerName}
      toritos={toritos}
      pending={pending}
      persists={Boolean(customerName) && !exampleCount}
      focusId={claimedId ?? newToritoId}
      notice={claimError ?? loadError}
      accountHref={accountHref}
    />
  );
}

/** Invita a guardar al torito mientras se ve cómo entra al establo. */
function SavePrompt({
  assetsPath,
  pending,
  authError,
}: {
  assetsPath: string;
  /** Torito elegido antes de iniciar sesión; sin él, alguien que vuelve a ver su establo. */
  pending: OwnedTorito | null;
  authError: string | null;
}) {
  const torito = pending ?? exampleTorito();
  const walkerRef = useRef<HTMLDivElement>(null);
  const hopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const walker = walkerRef.current;
    const hop = hopRef.current;
    if (!walker || !hop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      walker.style.transform = 'translate(112%, -54%) scale(0.6)';
      return;
    }
    const walk = walker.animate(
      [
        // Cruza el patio hacia la puerta y se hace pequeño al alejarse.
        { transform: 'translate(8%, 0) scale(1)', opacity: 0, offset: 0 },
        { transform: 'translate(20%, -4%) scale(0.96)', opacity: 1, offset: 0.08 },
        { transform: 'translate(112%, -54%) scale(0.6)', opacity: 1, offset: 0.56 },
        { transform: 'translate(146%, -85%) scale(0.37)', opacity: 1, offset: 0.76 },
        { transform: 'translate(146%, -92%) scale(0.29)', opacity: 0, offset: 0.86 },
        { transform: 'translate(146%, -92%) scale(0.29)', opacity: 0, offset: 1 },
      ],
      { duration: WALK_MS, iterations: Infinity, easing: 'linear' },
    );
    const bounce = hop.animate(
      [
        { transform: 'translateY(0) rotate(-1.4deg)' },
        { transform: 'translateY(-4%) rotate(0deg)' },
        { transform: 'translateY(0) rotate(1.4deg)' },
        { transform: 'translateY(-4%) rotate(0deg)' },
        { transform: 'translateY(0) rotate(-1.4deg)' },
      ],
      { duration: 900, iterations: Infinity, easing: 'ease-in-out' },
    );
    return () => {
      walk.cancel();
      bounce.cancel();
    };
  }, []);

  return (
    <main className="surface-dark flex min-h-svh flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:p-8">
      <div className="relative aspect-[1122/1402] w-full shrink-0 overflow-hidden lg:h-[calc(100svh-4rem)] lg:w-[calc((100svh-4rem)*0.8003)] lg:rounded-md">
        <img
          src={`${assetsPath}/establo-fuera.webp`}
          alt="Un establo de adobe con techo de paja y la puerta abierta, en las montañas"
          width={1122}
          height={1402}
          className="absolute inset-0 size-full object-cover"
        />
        <div
          ref={walkerRef}
          className="pointer-events-none absolute bottom-[14%] left-0 aspect-[930/1040] w-[38%] origin-bottom"
        >
          <div ref={hopRef} className="size-full origin-bottom">
            <ToritoSprite torito={torito} assetsPath={assetsPath} greets={false} />
          </div>
        </div>
      </div>

      <section className="flex flex-1 flex-col gap-5 px-5 py-8 lg:w-[400px] lg:flex-none lg:px-0">
        <p className="type-label inline-flex items-center gap-3">
          <span aria-hidden="true" className="rombo" />
          {pending ? `${torito.name} ya va en camino` : 'Tu establo'}
        </p>
        <h1 className="type-h1">
          <Emphasis
            text={pending ? `No pierdas a *${torito.name}*` : 'Entra a ver a tus *toritos*'}
          />
        </h1>
        <p className="type-body">
          {pending
            ? 'Guárdalo en tu establo: ahí te esperará siempre, podrás visitarlo cuando quieras y reunir a todos tus toritos.'
            : 'Inicia sesión para visitarlos desde cualquier celular o computadora: cada día tienen algo nuevo que contarte.'}
        </p>
        {authError && (
          <p role="alert" className="type-meta rounded-sm bg-brand-tint px-4 py-3 text-text">
            {authError}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <GoogleButton label="Continuar con Google" />
          <p className="type-meta text-on-dark-muted">
            ¿Es tu primera vez? Creamos tu cuenta al instante, sin formularios ni contraseñas.
          </p>
        </div>
        <a
          href={`${ESTABLO_PATH}?vista=previa`}
          className="w-fit border-t border-border-dark pt-5 text-[15px] font-medium text-on-dark underline underline-offset-[6px]"
        >
          Primero quiero ver el establo
        </a>
      </section>
    </main>
  );
}

function Stable({
  assetsPath,
  customerName,
  toritos,
  pending,
  persists,
  focusId,
  notice,
  accountHref,
}: {
  assetsPath: string;
  customerName: string | null;
  toritos: OwnedTorito[] | null;
  pending: OwnedTorito | null;
  persists: boolean;
  focusId: string | null;
  notice: string | null;
  accountHref: string;
}) {
  const firstName = customerName?.split(' ')[0];
  // Sin sesión y sin toritos, la vista previa enseña uno para que se entienda la idea.
  const residents =
    toritos && toritos.length === 0 && !customerName ? [pending ?? exampleTorito()] : toritos;
  const count = residents?.length ?? 0;

  return (
    <EstabloStable
      assetsPath={assetsPath}
      toritos={residents}
      persists={persists}
      focusId={focusId}
      intro={(establos) => (
        <>
          <p className="type-label inline-flex items-center gap-3">
            <span aria-hidden="true" className="rombo" />
            {!residents
              ? 'Tu establo'
              : `${count === 1 ? '1 torito' : `${count} toritos`} · ${
                  establos === 1 ? '1 establo' : `${establos} establos`
                }`}
          </p>
          <h1 className="type-h1 break-words">
            {firstName ? `El establo de ${firstName}` : 'Así será tu establo'}
          </h1>
          <p className="type-body">
            {!residents
              ? 'Tus toritos ya vienen.'
              : count > 0
                ? 'Cada día tienen algo nuevo que contarte. Toca a un torito para que se acerque.'
                : 'Todavía no tienes toritos. Escanea el QR de tu pieza para verlo nacer.'}
          </p>
          {notice && (
            <p role="alert" className="type-meta rounded-sm bg-surface px-4 py-3 text-text">
              {notice}
            </p>
          )}
        </>
      )}
      actions={
        customerName ? (
          <nav aria-label="Salir del establo" className="flex flex-wrap gap-x-6 gap-y-2">
            <a
              href="/"
              className="text-[15px] font-medium text-on-dark underline underline-offset-[6px]"
            >
              Ir a la tienda
            </a>
            <a
              href={accountHref}
              className="text-[15px] font-medium text-on-dark underline underline-offset-[6px]"
            >
              Mi cuenta
            </a>
          </nav>
        ) : (
          <GoogleButton label="Guardar con Google" />
        )
      }
    />
  );
}
