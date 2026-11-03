import {
  CUSTOMER_SIGNED_IN_COOKIE,
  type PieceViewDto,
  TORITO_ROUTES,
  type ToritoDto,
} from '@antrina/contracts';
import { Emphasis } from '@antrina/ui';
import { Button, Input, Label, TextArea, TextField } from '@heroui/react';
import { type FormEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { type BirthStage, loadToritoAssets, ToritoRenderer } from './torito-renderer';
import { ToritoApiError, toritoRequest } from './toritos-api';
import {
  cleanText,
  cleanToritoName,
  GIFT_MESSAGE_MAX_LENGTH,
  GIFT_NAME_MAX_LENGTH,
  type GiftNote,
  INTENTION_MAX_LENGTH,
  INTENTION_SUGGESTIONS,
  NAME_MAX_LENGTH,
  type Personality,
  PERSONALITIES,
  personalityById,
  savePendingClaim,
  TORITO_COLORS,
  type ToritoColor,
} from './toritos';

const STAGE_CAPTIONS: Record<BirthStage, string> = {
  forming: 'La arcilla toma forma…',
  painting: 'Se pintan sus historias…',
  waking: 'Abre los ojos…',
};

type Phase =
  'loading' | 'waiting' | 'gift-form' | 'gift-saved' | 'birth' | 'gift-reveal' | 'alive' | 'static';

const STEP_TITLES = ['¡Ya *despertó*!', '¿Cómo se *llamará*?', '¿Qué quieres que te *recuerde*?'];
const LIGHT_BUTTON = 'h-12 w-full bg-on-dark text-[15px] font-medium text-text';
const TEXT_LINK =
  'w-fit cursor-pointer text-[15px] font-medium text-on-dark underline underline-offset-[6px]';
const FIELD_LABEL = 'text-[15px] font-medium text-on-dark';

function PieceLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="type-label inline-flex items-center gap-3">
      <span aria-hidden="true" className="rombo" />
      {children}
    </p>
  );
}

const isSignedIn = () => document.cookie.split('; ').includes(`${CUSTOMER_SIGNED_IN_COOKIE}=1`);

/**
 * Lo que abre el QR: nace, se elige color, nombre e intención, y va al establo.
 * Sin `piece` es la demostración: nada se guarda.
 */
export function ToritoBirth({
  assetsPath,
  establoHref,
  forestHref,
  piece,
}: {
  assetsPath: string;
  establoHref: string;
  /** Después de nacer, su puerta se abre en el bosque. */
  forestHref: string;
  piece: PieceViewDto | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ToritoRenderer | null>(null);
  const giftRef = useRef<GiftNote | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [caption, setCaption] = useState('');
  const [personality, setPersonality] = useState<Personality>(
    personalityById(piece?.personalityCode) ?? PERSONALITIES[0]!,
  );
  const [gift, setGift] = useState<GiftNote | null>(piece?.gift ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [color, setColor] = useState<ToritoColor>(TORITO_COLORS[0]!);
  const [name, setName] = useState('');
  const [intention, setIntention] = useState('');
  const cleanName = cleanToritoName(name);
  const pieceLabel = `Pieza N.º ${String(piece?.serial ?? 1).padStart(3, '0')}`;

  useEffect(() => {
    giftRef.current = gift;
  }, [gift]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const particles = particlesRef.current;
    if (!canvas || !particles) return;

    const demoIndex = Number(new URLSearchParams(window.location.search).get('t') ?? 1) - 1;
    const chosen =
      personalityById(piece?.personalityCode) ?? PERSONALITIES[demoIndex] ?? PERSONALITIES[0]!;
    setPersonality(chosen);
    giftRef.current = piece?.gift ?? null;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: ToritoRenderer | null = null;
    let isActive = true;
    const onResize = () => renderer?.resize();

    loadToritoAssets(assetsPath)
      .then((assets) => {
        if (!isActive) return;
        renderer = new ToritoRenderer(canvas, particles, assets, chosen.temperament, reducedMotion);
        renderer.onStage = (stage) => setCaption(STAGE_CAPTIONS[stage]);
        renderer.onBorn = () => setPhase(giftRef.current ? 'gift-reveal' : 'alive');
        renderer.onContextLost = () => setPhase('static');
        rendererRef.current = renderer;
        window.addEventListener('resize', onResize);
        renderer.start();
        setPhase('waiting');
      })
      .catch(() => {
        if (isActive) setPhase('static');
      });

    return () => {
      isActive = false;
      window.removeEventListener('resize', onResize);
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, [assetsPath, piece]);

  const position = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const wake = () => {
    setCaption(STAGE_CAPTIONS.forming);
    setGreeting(null);
    setStep(0);
    setPhase('birth');
    rendererRef.current?.playBirth();
  };

  const chooseColor = (next: ToritoColor) => {
    setColor(next);
    rendererRef.current?.setColor(next.rgb);
    rendererRef.current?.greet();
  };

  const advance = (event: FormEvent) => {
    event.preventDefault();
    if (step === 1 && !cleanName) return;
    if (step < STEP_TITLES.length - 1) {
      setStep(step + 1);
      rendererRef.current?.greet();
      return;
    }
    void takeToStable(intention);
  };

  const takeToStable = async (chosenIntention: string) => {
    const claim = {
      name: cleanName,
      colorCode: color.id,
      intention: cleanText(chosenIntention, INTENTION_MAX_LENGTH) || null,
    };
    if (!piece) {
      window.location.assign(`${forestHref}?ejemplo=1`);
      return;
    }
    const keepForAfterLogin = () => {
      savePendingClaim({
        ...claim,
        code: piece.code,
        personalityCode: personality.id,
        serial: piece.serial,
        gift,
      });
      window.location.assign(establoHref);
    };
    if (!isSignedIn()) {
      keepForAfterLogin();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const torito = await toritoRequest<ToritoDto>(
        'POST',
        TORITO_ROUTES.pieceClaim(piece.code),
        claim,
      );
      window.location.assign(`${forestHref}?desbloquear=torito&nuevo=${torito.id}`);
    } catch (failure) {
      setSaving(false);
      // La cookie indicadora puede sobrevivir a una sesión ya caducada.
      if (failure instanceof ToritoApiError && failure.status === 401) keepForAfterLogin();
      else setError(failure instanceof Error ? failure.message : 'No pudimos guardarlo.');
    }
  };

  const saveGift = async (note: GiftNote) => {
    if (piece) await toritoRequest('PUT', TORITO_ROUTES.pieceGift(piece.code), note);
    setGift(note);
    setPhase('gift-saved');
  };

  return (
    <main className="surface-dark flex min-h-svh flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:p-8">
      <div
        className="relative aspect-[1122/1402] w-full shrink-0 touch-pan-y overflow-hidden select-none lg:h-[calc(100svh-4rem)] lg:w-[calc((100svh-4rem)*0.8003)] lg:rounded-md"
        onPointerMove={(event) => {
          const { x, y } = position(event);
          rendererRef.current?.pointerAt(x, y);
        }}
        onPointerDown={(event) => {
          const { x, y } = position(event);
          if (rendererRef.current?.tapAt(x, y)) {
            setGreeting(personality.greeting(cleanName || 'Tu torito'));
          }
        }}
      >
        {phase === 'static' ? (
          <img
            src={`${assetsPath}/base.webp`}
            alt="Torito de Pucará en las montañas"
            width={1122}
            height={1402}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <>
            <canvas ref={canvasRef} className="absolute inset-0 size-full" />
            <canvas
              ref={particlesRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full"
            />
          </>
        )}
        {phase === 'birth' && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-3 top-3 text-on-dark"
            onPress={() => rendererRef.current?.skipBirth()}
          >
            Saltar
          </Button>
        )}
      </div>

      <section
        className="flex flex-1 flex-col gap-5 px-5 py-8 lg:w-[400px] lg:flex-none lg:px-0"
        aria-live="polite"
      >
        {(phase === 'loading' || phase === 'waiting') &&
          (gift ? (
            <>
              <PieceLabel>Un regalo {gift.to ? `para ${gift.to}` : 'para ti'}</PieceLabel>
              <h1 className="type-h1 break-words">
                <Emphasis text={`${gift.from} te regaló *un torito*`} />
              </h1>
              <p className="type-body">Despiértalo: dentro te espera su mensaje.</p>
              <Button
                size="lg"
                className={LIGHT_BUTTON}
                isDisabled={phase === 'loading'}
                onPress={wake}
              >
                {phase === 'loading' ? 'Preparando la arcilla…' : 'Despertar a mi torito'}
              </Button>
              <button
                type="button"
                className={`${TEXT_LINK} text-[14px]`}
                onClick={() => setPhase('gift-form')}
              >
                ¿Lo regalaste tú? Cambiar el mensaje
              </button>
            </>
          ) : (
            <>
              <PieceLabel>{pieceLabel}</PieceLabel>
              <h1 className="type-h1">
                <Emphasis text="Tu torito está por *nacer*" />
              </h1>
              <p className="type-body">
                Lo armamos a mano en nuestro taller. Ahora le toca despertar aquí, contigo.
              </p>
              <Button
                size="lg"
                className={LIGHT_BUTTON}
                isDisabled={phase === 'loading'}
                onPress={wake}
              >
                {phase === 'loading' ? 'Preparando la arcilla…' : 'Despertar a mi torito'}
              </Button>
              <button
                type="button"
                className={`${TEXT_LINK} border-t border-border-dark pt-5`}
                onClick={() => setPhase('gift-form')}
              >
                Es un regalo: dejar un mensaje
              </button>
            </>
          ))}

        {phase === 'gift-form' && (
          <GiftForm initial={gift} onCancel={() => setPhase('waiting')} onSave={saveGift} />
        )}

        {phase === 'gift-saved' && gift && (
          <>
            <PieceLabel>Mensaje guardado</PieceLabel>
            <h1 className="type-h1">
              <Emphasis text="Tu mensaje ya está *dentro*" />
            </h1>
            <p className="type-body">
              {gift.to || 'Quien lo reciba'} lo leerá justo cuando su torito despierte. Entrégalo
              sin despertarlo, para no quitarle la sorpresa.
            </p>
            <Button size="lg" className={LIGHT_BUTTON} onPress={() => setPhase('waiting')}>
              Ver cómo lo recibirá
            </Button>
            <button type="button" className={TEXT_LINK} onClick={() => setPhase('gift-form')}>
              Cambiar el mensaje
            </button>
          </>
        )}

        {phase === 'birth' && (
          <>
            <PieceLabel>{pieceLabel}</PieceLabel>
            <h1 className="type-h2">{caption}</h1>
          </>
        )}

        {phase === 'gift-reveal' && gift && (
          <>
            <PieceLabel>Un mensaje de {gift.from}</PieceLabel>
            <h1 className="type-h2 break-words whitespace-pre-line">{gift.message}</h1>
            <p className="type-meta text-on-dark-muted">
              {gift.to ? `Para ${gift.to}, de parte de ${gift.from}.` : `De parte de ${gift.from}.`}{' '}
              Quedará guardado con tu torito.
            </p>
            <Button size="lg" className={LIGHT_BUTTON} onPress={() => setPhase('alive')}>
              Conocer a mi torito
            </Button>
          </>
        )}

        {(phase === 'alive' || phase === 'static') && (
          <form className="flex flex-col gap-6" onSubmit={advance}>
            <div className="flex flex-col gap-3">
              <PieceLabel>
                Paso {step + 1} de {STEP_TITLES.length} · {personality.trait}
              </PieceLabel>
              <h1 className="type-h1">
                <Emphasis text={STEP_TITLES[step]!} />
              </h1>
            </div>

            {step === 0 && (
              <>
                <p className="type-body">{personality.story}</p>
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-3 text-[15px] font-medium text-on-dark">
                    ¿De qué color es tu torito?{' '}
                    <span className="font-normal text-on-dark-muted">{color.label}</span>
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {TORITO_COLORS.map((option) => (
                      <label key={option.id} className="cursor-pointer" title={option.label}>
                        <input
                          type="radio"
                          name="color"
                          value={option.id}
                          checked={option.id === color.id}
                          onChange={() => chooseColor(option)}
                          className="peer sr-only"
                        />
                        <span className="sr-only">{option.label}</span>
                        <span
                          aria-hidden="true"
                          style={{ backgroundColor: option.swatch }}
                          className="block size-11 rounded-full border-2 border-border-dark outline-2 outline-offset-2 outline-transparent transition peer-checked:border-on-dark peer-checked:outline-on-dark peer-focus-visible:outline-clay"
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Button type="submit" size="lg" className={LIGHT_BUTTON}>
                  Siguiente
                </Button>
              </>
            )}

            {step === 1 && (
              <>
                <TextField
                  value={name}
                  onChange={setName}
                  isRequired
                  aria-label="Nombre de tu torito"
                  className="flex flex-col gap-2"
                >
                  <Input
                    autoFocus
                    maxLength={NAME_MAX_LENGTH}
                    placeholder={`Por ejemplo, ${personality.name}`}
                    autoComplete="off"
                    className="h-12 text-[16px]"
                  />
                </TextField>
                <Button type="submit" size="lg" isDisabled={!cleanName} className={LIGHT_BUTTON}>
                  {cleanName ? `Siguiente: ${cleanName}` : 'Ponle un nombre para continuar'}
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <p className="type-body">
                  Escribe tu intención y {cleanName} te la recordará cada vez que vengas a verlo. Es
                  solo para ti.
                </p>
                <TextField
                  value={intention}
                  onChange={setIntention}
                  aria-label="Tu intención"
                  className="flex flex-col gap-2"
                >
                  <TextArea
                    rows={3}
                    maxLength={INTENTION_MAX_LENGTH}
                    placeholder="Por ejemplo, terminar lo que empecé"
                    className="text-[16px]"
                  />
                </TextField>
                <ul className="flex flex-wrap gap-2">
                  {INTENTION_SUGGESTIONS.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-border-dark px-3 py-1.5 text-[14px] text-on-dark transition-colors hover:border-on-dark"
                        onClick={() => setIntention(suggestion)}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="submit"
                  size="lg"
                  isDisabled={!cleanText(intention, INTENTION_MAX_LENGTH) || isSaving}
                  className={LIGHT_BUTTON}
                >
                  Llevar a {cleanName} a mi establo
                </Button>
                <button
                  type="button"
                  className={TEXT_LINK}
                  disabled={isSaving}
                  onClick={() => void takeToStable('')}
                >
                  Ahora no, la escribo después
                </button>
              </>
            )}

            {error && (
              <p role="alert" className="type-meta rounded-sm bg-surface px-4 py-3 text-text">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <p className="type-meta text-on-dark-muted">{greeting ?? 'Tócalo para saludarlo.'}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {step > 0 && (
                  <button type="button" className={TEXT_LINK} onClick={() => setStep(step - 1)}>
                    Atrás
                  </button>
                )}
                {step === 0 && (
                  <button type="button" className={TEXT_LINK} onClick={wake}>
                    Verlo nacer otra vez
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function GiftForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: GiftNote | null;
  onSave: (note: GiftNote) => Promise<void>;
  onCancel: () => void;
}) {
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  const [message, setMessage] = useState(initial?.message ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const cleanFrom = cleanText(from, GIFT_NAME_MAX_LENGTH);
  const cleanMessage = message.trim().slice(0, GIFT_MESSAGE_MAX_LENGTH);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!cleanFrom || !cleanMessage) return;
        setSaving(true);
        setError(null);
        onSave({
          from: cleanFrom,
          to: cleanText(to, GIFT_NAME_MAX_LENGTH) || null,
          message: cleanMessage,
        }).catch((failure: unknown) => {
          setSaving(false);
          setError(failure instanceof Error ? failure.message : 'No pudimos guardarlo.');
        });
      }}
    >
      <div className="flex flex-col gap-3">
        <PieceLabel>Es un regalo</PieceLabel>
        <h1 className="type-h1">
          <Emphasis text="Déjale un *mensaje*" />
        </h1>
        <p className="type-body">
          Lo leerá justo cuando su torito despierte, y quedará guardado con él.
        </p>
      </div>
      <TextField value={from} onChange={setFrom} isRequired className="flex flex-col gap-2">
        <Label className={FIELD_LABEL}>De parte de</Label>
        <Input
          maxLength={GIFT_NAME_MAX_LENGTH}
          placeholder="Tu nombre"
          autoComplete="off"
          className="h-12 text-[16px]"
        />
      </TextField>
      <TextField value={to} onChange={setTo} className="flex flex-col gap-2">
        <Label className={FIELD_LABEL}>Para (opcional)</Label>
        <Input
          maxLength={GIFT_NAME_MAX_LENGTH}
          placeholder="Su nombre"
          autoComplete="off"
          className="h-12 text-[16px]"
        />
      </TextField>
      <TextField value={message} onChange={setMessage} isRequired className="flex flex-col gap-2">
        <Label className={FIELD_LABEL}>Tu mensaje</Label>
        <TextArea
          rows={4}
          maxLength={GIFT_MESSAGE_MAX_LENGTH}
          placeholder="Escribe lo que quieres que lea al abrirlo"
          className="text-[16px]"
        />
      </TextField>
      {error && (
        <p role="alert" className="type-meta rounded-sm bg-surface px-4 py-3 text-text">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        isDisabled={!cleanFrom || !cleanMessage || isSaving}
        className={LIGHT_BUTTON}
      >
        Guardar mensaje
      </Button>
      <button type="button" className={TEXT_LINK} onClick={onCancel}>
        Volver
      </button>
    </form>
  );
}
