import { ArrowRightIcon } from '@antrina/ui';
import { Button, Modal, TextArea, TextField } from '@heroui/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { TORITO_ROUTES, type ToritoDto, type ToritoVisitDto } from '@antrina/contracts';
import { intentionPromptOfTheDay, messageOfTheDay, todayKey } from './torito-messages';
import { toritoThumbnail } from './torito-thumbnails';
import { toritoRequest } from './toritos-api';
import { cleanText, INTENTION_MAX_LENGTH, type OwnedTorito } from './toritos';
import { type BubbleAlign, ToritoSprite } from './ToritoSprite';

/** Corrales en `establo-dentro.webp`: centro sobre la paja y ancho, en % de la imagen. */
const STALLS: readonly { center: number; width: number; bubble: BubbleAlign }[] = [
  { center: 16.6, width: 23.5, bubble: 'start' },
  { center: 50, width: 27, bubble: 'center' },
  { center: 83.6, width: 23.5, bubble: 'end' },
];

function intoPages(toritos: readonly OwnedTorito[]): OwnedTorito[][] {
  const pages: OwnedTorito[][] = [];
  for (let i = 0; i < toritos.length; i += STALLS.length) {
    pages.push(toritos.slice(i, i + STALLS.length));
  }
  return pages.length > 0 ? pages : [[]];
}

/** Lo que se anima a la vez: el establo visible y sus vecinos, para que deslizar no se vea vacío. */
const isNearby = (page: number, active: number) => Math.abs(page - active) <= 1;

interface Visit {
  torito: OwnedTorito;
  message: string;
  streak: number;
}

export type ToritoChanges = Partial<Pick<OwnedTorito, 'intention' | 'lastVisitOn' | 'visitStreak'>>;

export function EstabloStable({
  assetsPath,
  view,
  toritos: sourceToritos,
  persists,
  focusId,
  children,
  emptyCollection,
  showsToday,
  onToritoChange,
  onScan,
}: {
  assetsPath: string;
  /** Las dos pantallas del mundo: el interior del establo y todos sus toritos. */
  view: 'main' | 'collection';
  toritos: readonly OwnedTorito[] | null;
  /** Falso en las vistas de ejemplo: los cambios no se guardan. */
  persists: boolean;
  /** Torito que acaba de llegar: el establo se abre donde está. */
  focusId: string | null;
  /** Tarjetas de debajo del establo. */
  children: ReactNode;
  emptyCollection: ReactNode;
  /** En la vista previa no hay nadie a quien visitar todavía. */
  showsToday: boolean;
  onToritoChange: (id: string, change: ToritoChanges) => void;
  onScan: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const [visit, setVisit] = useState<Visit | null>(null);
  /** Lo cambiado en esta visita: la lista de toritos viene de fuera. */
  const [changes, setChanges] = useState<Record<string, ToritoChanges>>({});
  const toritos = sourceToritos?.map((torito) => ({ ...torito, ...changes[torito.id] })) ?? null;
  const pages = intoPages(toritos ?? []);

  const goToPage = (page: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: page * scroller.clientWidth, behavior });
    setActivePage(page);
  };

  const focusIndex = toritos?.findIndex((torito) => torito.id === focusId) ?? -1;
  useEffect(() => {
    if (focusIndex > 0) goToPage(Math.floor(focusIndex / STALLS.length), 'auto');
    // Solo al llegar: después manda quien desliza.
  }, [focusIndex]);

  const changeTorito = (id: string, change: ToritoChanges) => {
    setChanges((current) => ({ ...current, [id]: { ...current[id], ...change } }));
    onToritoChange(id, change);
  };

  const openVisit = (torito: OwnedTorito) => {
    const today = todayKey();
    setVisit({
      torito,
      message: messageOfTheDay(torito.id),
      streak: torito.lastVisitOn === today ? torito.visitStreak : 0,
    });
    if (!persists) {
      changeTorito(torito.id, { lastVisitOn: today, visitStreak: 1 });
      return;
    }
    // Si falla la red, el mensaje se lee igual y la visita se cuenta la próxima vez.
    void toritoRequest<ToritoVisitDto>('POST', TORITO_ROUTES.toritoVisit(torito.id))
      .then(({ lastVisitOn, visitStreak }) => {
        changeTorito(torito.id, { lastVisitOn, visitStreak });
        setVisit((open) =>
          open?.torito.id === torito.id ? { ...open, streak: visitStreak } : open,
        );
      })
      .catch(() => undefined);
  };

  const saveIntention = async (intention: string | null) => {
    if (!visit) return;
    const { id } = visit.torito;
    if (persists) {
      await toritoRequest<ToritoDto>('PATCH', TORITO_ROUTES.torito(id), { intention });
    }
    changeTorito(id, { intention });
    setVisit({ ...visit, torito: { ...visit.torito, intention } });
  };

  return (
    <>
      <div className={view === 'main' ? 'world-page' : 'hidden'}>
        <div className="world-scene relative aspect-[1122/1402] w-full shrink-0 overflow-hidden">
          <div
            ref={scrollerRef}
            className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              const { scrollLeft, clientWidth } = event.currentTarget;
              setActivePage(Math.round(scrollLeft / clientWidth));
            }}
          >
            {pages.map((page, pageIndex) => (
              <div key={pageIndex} className="relative size-full shrink-0 snap-center">
                <img
                  src={`${assetsPath}/establo-dentro.webp`}
                  alt={`Establo ${pageIndex + 1}: interior de adobe con tres corrales de paja`}
                  width={1122}
                  height={1402}
                  className="absolute inset-0 size-full object-cover"
                />
                {STALLS.map(({ center, width, bubble }, stallIndex) => {
                  const torito = page[stallIndex];
                  return (
                    <div
                      key={center}
                      className="absolute bottom-[26%] aspect-[930/1040] -translate-x-1/2"
                      style={{ left: `${center}%`, width: `${width}%` }}
                    >
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-[6%] bottom-[-3%] h-[11%] rounded-[50%] bg-text opacity-30 blur-md"
                      />
                      {torito ? (
                        <>
                          {isNearby(pageIndex, activePage) && (
                            <ToritoSprite
                              key={`${torito.id}-${torito.color.id}`}
                              torito={torito}
                              assetsPath={assetsPath}
                              bubbleAlign={bubble}
                              isPaused={pageIndex !== activePage}
                              onSelect={() => openVisit(torito)}
                            />
                          )}
                          {torito.lastVisitOn !== todayKey() && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute -top-[4%] left-[62%] flex size-7 items-center justify-center motion-safe:animate-bounce"
                            >
                              <span className="rombo scale-[2.4]" />
                            </span>
                          )}
                          <p className="absolute inset-x-0 top-[106%] mx-auto w-fit max-w-[120%] truncate rounded-sm bg-brand px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-on-dark lg:px-3 lg:py-1 lg:text-[13px]">
                            {torito.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <img
                            src={`${assetsPath}/silueta.webp`}
                            alt=""
                            className="absolute inset-0 size-full opacity-20"
                          />
                          {toritos && (
                            <p className="absolute inset-x-0 top-[106%] mx-auto w-fit rounded-sm bg-brand px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-on-dark-muted lg:px-3 lg:py-1 lg:text-[13px]">
                              Corral libre
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {pages.length > 1 && (
            <nav
              aria-label="Establos"
              className="absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-1 rounded-full bg-brand p-1 text-on-dark"
            >
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Establo anterior"
                isDisabled={activePage === 0}
                className="text-on-dark"
                onPress={() => goToPage(activePage - 1)}
              >
                <ArrowRightIcon className="rotate-180" />
              </Button>
              <span aria-live="polite" className="px-2 text-[13px] font-medium whitespace-nowrap">
                Establo {activePage + 1} de {pages.length}
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Establo siguiente"
                isDisabled={activePage === pages.length - 1}
                className="text-on-dark"
                onPress={() => goToPage(activePage + 1)}
              >
                <ArrowRightIcon />
              </Button>
            </nav>
          )}
        </div>

        <section className="world-side">
          {showsToday && toritos && toritos.length > 0 && (
            <TodayCard
              toritos={toritos}
              focusId={focusId}
              onVisit={(torito) => {
                goToPage(Math.floor(toritos.indexOf(torito) / STALLS.length));
                openVisit(torito);
              }}
            />
          )}
          {children}
        </section>
      </div>

      {view === 'collection' && (
        <div className="world-grid-page">
          {toritos && toritos.length > 0 ? (
            <ToritoGallery
              assetsPath={assetsPath}
              toritos={toritos}
              onSelect={openVisit}
              onScan={onScan}
            />
          ) : (
            emptyCollection
          )}
        </div>
      )}

      <ToritoVisit
        assetsPath={assetsPath}
        visit={visit}
        onClose={() => setVisit(null)}
        onIntentionChange={saveIntention}
      />
    </>
  );
}

/** Lo primero que se ve debajo del establo: quién tiene algo que contarte hoy. */
function TodayCard({
  toritos,
  focusId,
  onVisit,
}: {
  toritos: readonly OwnedTorito[];
  focusId: string | null;
  onVisit: (torito: OwnedTorito) => void;
}) {
  const today = todayKey();
  const waiting = toritos.filter((torito) => torito.lastVisitOn !== today);
  const newcomer = toritos.find((torito) => torito.id === focusId);
  const next = newcomer && waiting.includes(newcomer) ? newcomer : waiting[0];

  if (!next) {
    return (
      <div className="world-card">
        <span className="world-card-label">Hoy</span>
        <h2 className="font-display">Ya los visitaste a todos</h2>
        <p>Vuelve mañana: tendrán algo nuevo que contarte.</p>
      </div>
    );
  }
  const others = waiting.length - 1;
  return (
    <div className="world-card">
      <span className="world-card-label">{next === newcomer ? '¡Acaba de llegar!' : 'Hoy'}</span>
      <h2 className="font-display break-words">{next.name} tiene algo que contarte</h2>
      {others > 0 && (
        <p>
          {others === 1
            ? 'Otro torito también te espera.'
            : `Otros ${others} toritos también te esperan.`}
        </p>
      )}
      <div className="world-card-actions">
        <button type="button" className="world-primary" onClick={() => onVisit(next)}>
          Visitar a {next.name}
        </button>
      </div>
    </div>
  );
}

function ToritoGallery({
  assetsPath,
  toritos,
  onSelect,
  onScan,
}: {
  assetsPath: string;
  toritos: readonly OwnedTorito[];
  onSelect: (torito: OwnedTorito) => void;
  onScan: () => void;
}) {
  const today = todayKey();
  return (
    <ul className="world-grid">
      {toritos.map((torito) => (
        <li key={torito.id}>
          <button type="button" className="world-tile" onClick={() => onSelect(torito)}>
            <ToritoThumb assetsPath={assetsPath} torito={torito} />
            <span className="world-tile-name">{torito.name}</span>
            <span className="world-tile-meta">
              {torito.lastVisitOn === today ? 'Visitado hoy' : 'Te espera'}
            </span>
          </button>
        </li>
      ))}
      <li>
        <button type="button" className="world-tile is-empty" onClick={onScan}>
          <span className="world-tile-name">Sumar otro</span>
          <span className="world-tile-meta">Escanea su QR</span>
        </button>
      </li>
    </ul>
  );
}

function ToritoThumb({ assetsPath, torito }: { assetsPath: string; torito: OwnedTorito }) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    void toritoThumbnail(assetsPath, torito.color).then((image) => {
      if (isActive) setSource(image);
    });
    return () => {
      isActive = false;
    };
  }, [assetsPath, torito.color]);

  return source ? (
    <img src={source} alt="" width={186} height={208} className="aspect-[930/1040] w-full" />
  ) : (
    <span className="aspect-[930/1040] w-full" />
  );
}

/** El torito se acerca, te cuenta su mensaje de hoy y te recuerda tu intención. */
function ToritoVisit({
  assetsPath,
  visit,
  onClose,
  onIntentionChange,
}: {
  assetsPath: string;
  visit: Visit | null;
  onClose: () => void;
  onIntentionChange: (intention: string | null) => Promise<void>;
}) {
  const approachRef = useRef<HTMLDivElement>(null);
  const [isEditing, setEditing] = useState(false);
  const [isGiftOpen, setGiftOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const toritoId = visit?.torito.id;

  useEffect(() => {
    setEditing(false);
    setGiftOpen(false);
  }, [toritoId]);

  useEffect(() => {
    const element = approachRef.current;
    if (!toritoId || !element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const approach = element.animate(
      [
        { transform: 'translateY(26%) scale(0.42)', opacity: 0 },
        { transform: 'translateY(12%) scale(0.62)', opacity: 1, offset: 0.35 },
        { transform: 'translateY(6%) scale(0.76)', offset: 0.55 },
        { transform: 'translateY(-3%) scale(0.92)', offset: 0.78 },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 1000, easing: 'ease-out' },
    );
    return () => approach.cancel();
  }, [toritoId]);

  const torito = visit?.torito;
  const startEditing = () => {
    setDraft(torito?.intention ?? '');
    setEditing(true);
  };

  return (
    <Modal.Backdrop
      isOpen={visit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container placement="center" size="sm">
        <Modal.Dialog
          aria-label={torito ? `Mensaje de ${torito.name}` : 'Mensaje'}
          className="max-h-[92svh] overflow-y-auto p-0"
        >
          <Modal.CloseTrigger aria-label="Cerrar" />
          {visit && torito && (
            <>
              <div className="flex justify-center overflow-hidden rounded-t-md bg-bg-alt px-6 pt-6 pb-2">
                <div
                  ref={approachRef}
                  className="aspect-[930/1040] w-[min(42vw,170px)] origin-bottom"
                >
                  <ToritoSprite
                    torito={torito}
                    assetsPath={assetsPath}
                    showBubble={false}
                    greetsOnStart
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 p-6 text-center">
                <p className="type-label">Hoy {torito.name} te dice</p>
                <p className="type-h3 text-text">{visit.message}</p>

                <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
                  <p className="type-meta font-medium text-text-muted">Tu intención</p>
                  {isEditing ? (
                    <form
                      className="flex w-full flex-col gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setEditError(null);
                        onIntentionChange(cleanText(draft, INTENTION_MAX_LENGTH) || null)
                          .then(() => setEditing(false))
                          .catch((failure: unknown) =>
                            setEditError(
                              failure instanceof Error ? failure.message : 'No pudimos guardarla.',
                            ),
                          );
                      }}
                    >
                      <TextField
                        value={draft}
                        onChange={setDraft}
                        aria-label="Tu intención"
                        className="flex flex-col"
                      >
                        <TextArea
                          autoFocus
                          onFocus={(event) => event.currentTarget.select()}
                          rows={2}
                          maxLength={INTENTION_MAX_LENGTH}
                          placeholder="¿Qué quieres que te recuerde?"
                          className="text-[16px]"
                        />
                      </TextField>
                      {editError && (
                        <p role="alert" className="type-meta text-danger">
                          {editError}
                        </p>
                      )}
                      <Button type="submit" size="sm" variant="secondary" className="w-full">
                        Guardar
                      </Button>
                    </form>
                  ) : torito.intention ? (
                    <>
                      <p className="text-[17px] font-medium break-words text-text">
                        “{torito.intention}”
                      </p>
                      <p className="type-body">{intentionPromptOfTheDay(torito.id)}</p>
                      <button
                        type="button"
                        className="cursor-pointer text-[14px] font-medium text-clay-strong underline underline-offset-4"
                        onClick={startEditing}
                      >
                        Cambiar mi intención
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="cursor-pointer text-[15px] font-medium text-clay-strong underline underline-offset-4"
                      onClick={startEditing}
                    >
                      Escribe qué quieres que {torito.name} te recuerde
                    </button>
                  )}
                </div>

                {torito.gift && (
                  <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
                    {isGiftOpen ? (
                      <>
                        <p className="type-meta font-medium text-text-muted">
                          El mensaje de {torito.gift.from}
                        </p>
                        <p className="text-[16px] break-words whitespace-pre-line text-text">
                          {torito.gift.message}
                        </p>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="cursor-pointer text-[15px] font-medium text-clay-strong underline underline-offset-4"
                        onClick={() => setGiftOpen(true)}
                      >
                        Volver a leer el mensaje de {torito.gift.from}
                      </button>
                    )}
                  </div>
                )}

                <p className="type-meta text-text-muted">
                  {visit.streak > 1
                    ? `Llevas ${visit.streak} días seguidos visitando a ${torito.name}.`
                    : `Vuelve mañana: ${torito.name} tendrá algo nuevo que contarte.`}
                </p>
                <Button variant="primary" className="h-12 w-full" onPress={onClose}>
                  Seguir en el establo
                </Button>
              </div>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
