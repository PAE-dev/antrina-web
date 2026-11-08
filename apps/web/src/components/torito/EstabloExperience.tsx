import { CUSTOMER_AUTH_ROUTES } from '@antrina/contracts';
import { ButtonLink, Emphasis, GoogleIcon } from '@antrina/ui';
import { useEffect, useRef } from 'react';
import { EstabloStable, type ToritoChanges } from './EstabloStable';
import { exampleTorito, type OwnedTorito } from './toritos';
import { ToritoSprite } from './ToritoSprite';

const WALK_MS = 7600;
/** Con un torito por guardar, al volver de Google se abre su puerta en el bosque. */
const UNLOCK_PATH = '/mundos?desbloquear=torito';

function GoogleButton({ label, next }: { label: string; next: string }) {
  return (
    <ButtonLink
      href={`${CUSTOMER_AUTH_ROUTES.googleStart}?next=${encodeURIComponent(next)}`}
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

/** Lo que recibe el interior de cualquier mundo: la app pone los datos, la cabecera y el menú. */
export interface WorldScreenProps {
  assetsPath: string;
  tab: 'main' | 'collection';
  customerName: string | null;
  toritos: OwnedTorito[] | null;
  pending: OwnedTorito | null;
  persists: boolean;
  focusId: string | null;
  notice: string | null;
  onScan: () => void;
  onProfile: () => void;
  onShop: () => void;
  onToritoChange: (id: string, change: ToritoChanges) => void;
}

/** El mundo del torito: su establo y su colección. */
export function ToritoWorld({
  assetsPath,
  tab,
  customerName,
  toritos,
  pending,
  persists,
  focusId,
  notice,
  onScan,
  onProfile,
  onShop,
  onToritoChange,
}: WorldScreenProps) {
  // Sin sesión y sin toritos, se enseña uno de ejemplo para que se entienda la idea.
  const residents =
    toritos && toritos.length === 0 && !customerName ? [pending ?? exampleTorito()] : toritos;
  const isVisitor = !customerName && !persists && toritos?.length === 0;
  const isEmpty = toritos !== null && toritos.length === 0;

  const invitation = (
    <div className="world-card">
      <span className="world-card-label">{isVisitor ? 'Así será tu establo' : 'Tu establo'}</span>
      <h2 className="font-display">
        {pending
          ? `Guarda a ${pending.name}`
          : isVisitor
            ? 'Un torito ya te imagina aquí'
            : 'Todavía no tienes toritos'}
      </h2>
      <p>
        {pending
          ? 'Inicia sesión y te esperará siempre en tu establo.'
          : 'Escanea el QR de tu pieza para verlo nacer y traerlo a vivir aquí.'}
      </p>
      <div className="world-card-actions">
        {!pending && (
          <button type="button" className="world-primary" onClick={onScan}>
            Escanear mi QR
          </button>
        )}
        {!pending && (
          <button type="button" className="world-link" onClick={onShop}>
            Conseguir mi torito
          </button>
        )}
        {pending && <GoogleButton label="Guardar con Google" next={UNLOCK_PATH} />}
        {isVisitor && !pending && (
          <button type="button" className="world-link" onClick={onProfile}>
            Ya tengo cuenta
          </button>
        )}
      </div>
    </div>
  );

  return (
    <EstabloStable
      assetsPath={assetsPath}
      view={tab}
      toritos={isVisitor && tab === 'collection' ? [] : residents}
      persists={persists}
      focusId={focusId}
      onToritoChange={onToritoChange}
      onScan={onScan}
      emptyCollection={invitation}
      showsToday={!isVisitor}
    >
      {notice && (
        <p role="alert" className="type-meta rounded-md bg-surface px-4 py-3 text-text">
          {notice}
        </p>
      )}
      {(isEmpty || isVisitor) && invitation}
      {!isEmpty && !isVisitor && toritos && (
        <div className="world-card">
          <span className="world-card-label">Sumar otro torito</span>
          <p>Cada QR despierta a un torito nuevo. Si este establo se llena, se abre otro.</p>
          <div className="world-card-actions">
            <button type="button" className="world-primary" onClick={onShop}>
              Comprar otro torito
            </button>
            <button type="button" className="world-link" onClick={onScan}>
              Ya tengo su QR
            </button>
          </div>
        </div>
      )}
    </EstabloStable>
  );
}

/** Invita a guardar al torito mientras se ve cómo entra al establo. */
export function SavePrompt({
  assetsPath,
  pending,
  authError,
  onSkip,
}: {
  assetsPath: string;
  /** Torito elegido antes de iniciar sesión. */
  pending: OwnedTorito;
  authError: string | null;
  onSkip: () => void;
}) {
  const torito = pending;
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
          {torito.name} ya va en camino
        </p>
        <h1 className="type-h1">
          <Emphasis text={`No pierdas a *${torito.name}*`} />
        </h1>
        <p className="type-body">
          Guárdalo en tu establo: ahí te esperará siempre, podrás visitarlo cuando quieras y reunir
          a todos tus toritos.
        </p>
        {authError && (
          <p role="alert" className="type-meta rounded-sm bg-brand-tint px-4 py-3 text-text">
            {authError}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <GoogleButton label="Continuar con Google" next={UNLOCK_PATH} />
          <p className="type-meta text-on-dark-muted">
            ¿Es tu primera vez? Creamos tu cuenta al instante, sin formularios ni contraseñas.
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="w-fit cursor-pointer border-t border-border-dark pt-5 text-[15px] font-medium text-on-dark underline underline-offset-[6px]"
        >
          Primero quiero ver el establo
        </button>
      </section>
    </main>
  );
}
