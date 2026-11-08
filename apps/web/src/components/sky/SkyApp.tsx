import {
  type CustomerMeDto,
  type LocaleCode,
  type SkyBondDto,
  type SkyProfileDto,
} from '@antrina/contracts';
import { ArrowRightIcon } from '@antrina/ui';
import { Button } from '@heroui/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ELEMENT_OF,
  elementHarmony,
  julianDay,
  MODALITY_OF,
  seededIndex,
  SIGN_CODES,
  skyOfDay,
  type Element,
  type SignCode,
} from '../../sky/astrology';
import {
  AREA_CONTENT,
  AREAS,
  COMPAT_ROWS,
  COMPAT_TEXT,
  ELEMENT_COLOR,
  ELEMENT_LABEL,
  MODALITY_LABEL,
  PHASE_LABEL,
  SIGN_SKY,
  SKY_LABELS,
} from '../../sky/content';
import {
  longitudeOf,
  natalChart,
  PLANETS,
  transitsFor,
  type NatalChart,
  type Placement,
  type Planet,
  type Transit,
} from '../../sky/ephemeris';
import { searchPlaces, zonedToUtc, type Place } from '../../sky/geo';
import {
  ASK_ANSWERS,
  ASK_QUESTIONS,
  ASPECT_INFO,
  BODY_INFO,
  DAILY,
  DO_DONT,
  GLOSSARY,
  HOUSE_INFO,
  INTRO_SLIDES,
  MOON_DAY,
  NATAL_TEXT,
  REVEAL_LINES,
  TRANSIT_TEXT,
  type AskTopic,
  type GlossaryKey,
  type Nature,
} from '../../sky/guide';
import { SKY_UI } from '../../sky/labels';
import { googleLoginUrl, logout, skyApi, useAccount } from '../../lib/customer-client';
import { AccountChip, GoogleMark } from '../account/AccountChip';
import { compass, moonView } from '../../sky/moonview';
import { AREA_STONES, SIGN_STONE, signStone, STONE_LIBRARY } from '../../sky/stones';
import { LiveMoon } from './LiveMoon';
import { Orrery } from './Orrery';
import { ProductSheet, ShopTab, StoneSheet, type SkyProduct } from './Shop';
import {
  iconProps,
  InfoButton,
  Panel,
  range,
  Sheet,
  SKY_CSS,
  Starfield,
  StoneImage,
  WheelPicker,
} from './parts';

/* ------------------------------------------------------------------ tipos y datos */

export interface SkySign {
  code: SignCode;
  label: string;
  dates: string;
  stone: string;
  href: string;
}
export interface SkyStone {
  id: string;
  name: string;
  summary: string;
  href: string;
}
export interface SkyProps {
  locale: LocaleCode;
  signs: SkySign[];
  stones: SkyStone[];
  products: SkyProduct[];
  intentionHref: Record<string, string>;
  intentionLabel: Record<string, string>;
  createTreeHref: string;
  homeHref: string;
  /** "Mi cuenta": la sesión es la misma en todo el sitio. */
  accountHref: string;
}

interface Profile {
  date: string;
  time: string | null;
  place: Place | null;
}

interface AskEntry {
  question: string;
  topic: AskTopic;
  day: string;
}

type Step = 'welcome' | 'intro' | 'date' | 'time' | 'place' | 'reveal' | 'app';
type Tab = 'today' | 'chart' | 'ask' | 'bonds' | 'shop';

/** Cuenta de la persona y lo que guarda en ella (sincronizado con la base de datos). */
interface SkyCloud {
  account: CustomerMeDto | null;
  googleEnabled: boolean;
  bonds: SkyBondDto[];
  saveBond: (name: string, birthDate: string) => Promise<void>;
  deleteBond: (id: string) => void;
  recordQuestion: (entry: AskEntry) => void;
}
const CloudContext = createContext<SkyCloud>({
  account: null,
  googleEnabled: false,
  bonds: [],
  saveBond: async () => undefined,
  deleteBond: () => undefined,
  recordQuestion: () => undefined,
});

const CLOUD_UI = {
  es: {
    saveTitle: 'Guarda tu cielo',
    saveText:
      'Entra con Google y tu carta, tus preguntas y tus vínculos te esperan en cualquier dispositivo.',
    google: 'Continuar con Google',
    haveAccount: '¿Ya tienes cuenta?',
    saveBond: (name: string) => `Guardar a ${name} en mis vínculos`,
    savedBond: 'Guardado en tus vínculos',
    signInBond: 'Entra para guardar este vínculo',
    savedBonds: 'Tus vínculos',
    remove: 'Quitar',
    account: 'Tu cuenta',
    signedAs: 'Sesión iniciada como',
    signOut: 'Cerrar sesión',
    syncNote: 'Tu cielo se guarda en tu cuenta.',
  },
  en: {
    saveTitle: 'Save your sky',
    saveText:
      'Sign in with Google and your chart, questions and bonds will be waiting on any device.',
    google: 'Continue with Google',
    haveAccount: 'Already have an account?',
    saveBond: (name: string) => `Save ${name} to my bonds`,
    savedBond: 'Saved to your bonds',
    signInBond: 'Sign in to save this bond',
    savedBonds: 'Your bonds',
    remove: 'Remove',
    account: 'Your account',
    signedAs: 'Signed in as',
    signOut: 'Sign out',
    syncNote: 'Your sky is saved to your account.',
  },
} as const;

function toProfileDto(profile: Profile): SkyProfileDto {
  return { birthDate: profile.date, birthTime: profile.time, place: profile.place };
}
function fromProfileDto(dto: SkyProfileDto): Profile {
  return { date: dto.birthDate, time: dto.birthTime, place: dto.place };
}

/** Invitación a guardar el cielo en la cuenta (solo si no hay sesión). */
function CloudNudge({ locale }: { locale: LocaleCode }) {
  const { account, googleEnabled } = useContext(CloudContext);
  if (account || !googleEnabled) return null;
  const t = CLOUD_UI[locale];
  return (
    <Panel>
      <p className="type-label !text-[var(--accent)]">{t.saveTitle}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-on-dark/85">{t.saveText}</p>
      <a
        href={googleLoginUrl()}
        className="mt-4 inline-flex h-11 items-center gap-3 rounded-full bg-white px-5 text-[14px] font-medium text-black"
      >
        <GoogleMark />
        {t.google}
      </a>
    </Panel>
  );
}

/** Abre la hoja de una piedra (con sus piezas de la tienda) desde cualquier pantalla. */
const StoneContext = createContext<(id: string) => void>(() => undefined);

const PROFILE_KEY = 'antrina-sky';
const HERE_KEY = 'antrina-sky-here';

/** Desde dónde se mira el cielo (la Luna cambia de giro y altura según el lugar). */
interface Here {
  lat: number;
  lon: number;
  label: string;
  /** Viene del GPS del navegador. */
  precise?: boolean;
}
const LIMA: Here = { lat: -12.0464, lon: -77.0428, label: 'Lima' };

/** Planetas en este momento, para el planetario animado. */
function todayPoints(date: Date): { planet: Planet; longitude: number }[] {
  const jd = julianDay(date.getTime());
  return PLANETS.map((planet) => ({ planet, longitude: longitudeOf(planet, jd) }));
}

const MOON_UI: Record<
  LocaleCode,
  {
    from: string;
    up: (alt: number, dir: string) => string;
    down: string;
    locate: string;
    here: string;
  }
> = {
  es: {
    from: 'Vista desde',
    up: (alt, dir) => `ahora a ${alt}° sobre el horizonte, hacia el ${dir}`,
    down: 'ahora bajo el horizonte',
    locate: 'Usar mi ubicación',
    here: 'Tu ubicación',
  },
  en: {
    from: 'Seen from',
    up: (alt, dir) => `now ${alt}° above the horizon, toward the ${dir}`,
    down: 'now below the horizon',
    locate: 'Use my location',
    here: 'Your location',
  },
};
const INTRO_KEY = 'antrina-sky-intro';
const ASK_KEY = 'antrina-sky-asks';

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento */
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
const dayKey = (d: Date) => isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());

/** Carta de un perfil: con lugar y hora hay ascendente y casas. */
function chartOf(profile: Profile): NatalChart {
  const [y, m, d] = profile.date.split('-').map(Number) as [number, number, number];
  const time = profile.time ?? '12:00';
  const utc = profile.place
    ? zonedToUtc(profile.date, time, profile.place.timezone)
    : (() => {
        const [hh, mm] = time.split(':').map(Number) as [number, number];
        return new Date(y, m - 1, d, hh, mm).getTime();
      })();
  return natalChart({
    utc,
    place:
      profile.place && profile.time ? { lat: profile.place.lat, lon: profile.place.lon } : null,
  });
}

const sunOf = (chart: NatalChart) => chart.placements.find((p) => p.point === 'sun')!;
const moonOf = (chart: NatalChart) => chart.placements.find((p) => p.point === 'moon')!;

/* ------------------------------------------------------------------ app */

/** "Tu cielo": carta natal, guía diaria, preguntas y cuarzos (identidad Antrina). */
export function SkyApp(props: SkyProps) {
  const { locale, signs, homeHref } = props;
  const ui = SKY_UI[locale];
  const [step, setStep] = useState<Step>('welcome');
  const [tab, setTab] = useState<Tab>('today');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [glossary, setGlossary] = useState<GlossaryKey | 'all' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gps, setGps] = useState<Here | null>(null);

  // Borrador del onboarding.
  const [year, setYear] = useState(1995);
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [noTime, setNoTime] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    const saved = readJson<Profile>(PROFILE_KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved.date)) {
      setProfile({ date: saved.date, time: saved.time ?? null, place: saved.place ?? null });
      setStep('app');
    }
    const savedHere = readJson<Here>(HERE_KEY);
    if (savedHere && Number.isFinite(savedHere.lat)) setGps(savedHere);
  }, []);

  const here: Here =
    gps ??
    (profile?.place
      ? { lat: profile.place.lat, lon: profile.place.lon, label: profile.place.name }
      : LIMA);
  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: Here = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: MOON_UI[locale].here,
          precise: true,
        };
        writeJson(HERE_KEY, next);
        setGps(next);
      },
      () => undefined,
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }, [locale]);

  // Cuenta: si hay sesión, el cielo guardado en la base manda; si la base está vacía, se sube
  // el que ya estaba en este dispositivo. Sin sesión todo sigue funcionando en local.
  const { account, googleEnabled } = useAccount();
  const [bonds, setBonds] = useState<SkyBondDto[]>([]);
  useEffect(() => {
    if (!account) {
      setBonds([]);
      return;
    }
    let cancelled = false;
    void skyApi
      .get()
      .then(async (data) => {
        if (cancelled) return;
        setBonds(data.bonds);
        const local = readJson<Profile>(PROFILE_KEY);
        if (data.profile) {
          const remote = fromProfileDto(data.profile);
          writeJson(PROFILE_KEY, remote);
          setProfile(remote);
          setStep((current) => (current === 'welcome' || current === 'intro' ? 'app' : current));
        } else if (local && /^\d{4}-\d{2}-\d{2}$/.test(local.date)) {
          await skyApi.saveProfile(toProfileDto(local)).catch(() => undefined);
        }
        // Preguntas: las de la cuenta primero; las locales que falten se suben.
        const localAsks = readJson<AskEntry[]>(ASK_KEY) ?? [];
        const remoteAsks: AskEntry[] = data.questions.map((q) => ({
          question: q.question,
          topic: q.topic,
          day: q.day,
        }));
        const missing = localAsks.filter((l) => !remoteAsks.some((r) => r.question === l.question));
        for (const entry of missing.slice(0, 8).reverse()) {
          void skyApi.addQuestion(entry).catch(() => undefined);
        }
        writeJson(ASK_KEY, [...missing, ...remoteAsks].slice(0, 8));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [account]);

  const cloud = useMemo<SkyCloud>(
    () => ({
      account,
      googleEnabled,
      bonds,
      saveBond: async (name, birthDate) => {
        const bond = await skyApi.addBond({ name, birthDate });
        setBonds((list) => [bond, ...list]);
      },
      deleteBond: (id) => {
        setBonds((list) => list.filter((b) => b.id !== id));
        void skyApi.deleteBond(id).catch(() => undefined);
      },
      recordQuestion: (entry) => {
        if (account) void skyApi.addQuestion(entry).catch(() => undefined);
      },
    }),
    [account, googleEnabled, bonds],
  );

  const signBy = useMemo(() => new Map(signs.map((s) => [s.code, s])), [signs]);
  const chart = useMemo(() => (profile ? chartOf(profile) : null), [profile]);
  const accent = chart ? ELEMENT_COLOR[ELEMENT_OF[sunOf(chart).sign]] : '#c9b8ff';

  const loadDraft = (p: Profile) => {
    const [y, m, d] = p.date.split('-').map(Number) as [number, number, number];
    setYear(y);
    setMonth(m);
    setDay(d);
    setNoTime(p.time === null);
    if (p.time) {
      const [hh, mm] = p.time.split(':').map(Number) as [number, number];
      setHour(hh);
      setMinute(mm);
    }
    setPlace(p.place);
  };

  const save = () => {
    const next: Profile = {
      date: isoDate(year, month, Math.min(day, daysIn(year, month))),
      time: noTime ? null : `${pad(hour)}:${pad(minute)}`,
      place,
    };
    writeJson(PROFILE_KEY, next);
    setProfile(next);
    if (account) void skyApi.saveProfile(toProfileDto(next)).catch(() => undefined);
    if (editing) {
      setEditing(false);
      setStep('app');
    } else setStep('reveal');
  };

  const edit = (target: 'date' | 'time' | 'place') => {
    if (profile) loadDraft(profile);
    setEditing(true);
    setSettingsOpen(false);
    setStep(target);
  };

  const forget = () => {
    if (account) void skyApi.forget().catch(() => undefined);
    setBonds([]);
    writeJson(PROFILE_KEY, null);
    writeJson(ASK_KEY, null);
    setProfile(null);
    setSettingsOpen(false);
    setStep('welcome');
  };

  const startOnboarding = () => {
    const seen = readJson<boolean>(INTRO_KEY);
    setStep(seen ? 'date' : 'intro');
  };

  const openGlossary = useCallback((key: GlossaryKey | 'all') => setGlossary(key), []);

  return (
    <CloudContext.Provider value={cloud}>
      <div
        className="sky-root relative min-h-dvh overflow-x-hidden text-on-dark"
        style={{ ['--accent' as string]: accent }}
      >
        <style>{SKY_CSS}</style>
        <Starfield />

        {step !== 'app' && (
          <header className="relative z-10 flex items-center justify-between px-5 pt-5 md:px-10 md:pt-8">
            {step === 'welcome' || step === 'reveal' ? (
              <a href={homeHref} aria-label="Antrina">
                <img src="/brand/antrina-logo-negativo.svg" alt="Antrina" className="h-9 w-auto" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (editing) {
                    setEditing(false);
                    setStep('app');
                    return;
                  }
                  const order: Step[] = ['welcome', 'intro', 'date', 'time', 'place'];
                  const i = order.indexOf(step);
                  setStep(order[Math.max(0, i - 1)] ?? 'welcome');
                }}
                className="flex items-center gap-2 text-[14px] text-on-dark-muted"
              >
                <svg {...iconProps} width={20} height={20}>
                  <path d="m15 6-6 6 6 6" />
                </svg>
                {editing ? ui.close : ui.back}
              </button>
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => openGlossary('all')}
                className="text-[14px] text-on-dark-muted underline decoration-on-dark/30 underline-offset-[6px]"
              >
                {ui.guide}
              </button>
              <AccountChip locale={locale} accountHref={props.accountHref} />
            </div>
          </header>
        )}

        <main className="relative z-10 mx-auto w-full max-w-[560px] px-5">
          {step === 'welcome' && <Welcome locale={locale} onStart={startOnboarding} here={here} />}
          {step === 'intro' && (
            <Intro
              locale={locale}
              onDone={() => {
                writeJson(INTRO_KEY, true);
                setStep(profile && editing ? 'app' : profile ? 'app' : 'date');
              }}
            />
          )}
          {step === 'date' && (
            <OnboardStep
              title={ui.dateTitle}
              note={ui.dataNote}
              onNext={() => setStep('time')}
              cta={ui.continue}
            >
              <div className="grid grid-cols-[0.8fr_1.6fr_1.1fr] gap-1">
                <WheelPicker
                  label={ui.day}
                  value={Math.min(day, daysIn(year, month))}
                  onChange={setDay}
                  options={range(1, daysIn(year, month)).map((d) => [d, String(d)])}
                />
                <WheelPicker
                  label={ui.month}
                  value={month}
                  onChange={setMonth}
                  options={range(1, 12).map((m) => [
                    m,
                    new Date(2000, m - 1, 1).toLocaleDateString(locale, { month: 'long' }),
                  ])}
                />
                <WheelPicker
                  label={ui.year}
                  value={year}
                  onChange={setYear}
                  options={range(new Date().getFullYear(), 1920, -1).map((y) => [y, String(y)])}
                />
              </div>
            </OnboardStep>
          )}
          {step === 'time' && (
            <OnboardStep
              title={ui.timeTitle}
              note={ui.dataNote}
              onNext={() => setStep('place')}
              cta={ui.continue}
            >
              <div
                className={`grid grid-cols-2 gap-1 transition-opacity ${noTime ? 'pointer-events-none opacity-25' : ''}`}
              >
                <WheelPicker
                  label={ui.hour}
                  value={hour}
                  onChange={setHour}
                  options={range(0, 23).map((h) => [h, pad(h)])}
                  align="right"
                />
                <WheelPicker
                  label={ui.minute}
                  value={minute}
                  onChange={setMinute}
                  options={range(0, 59).map((m) => [m, pad(m)])}
                  align="left"
                />
              </div>
              <button
                type="button"
                onClick={() => setNoTime((v) => !v)}
                className={`mx-auto mt-6 flex items-center gap-3 rounded-full border px-4 py-2 text-[14px] transition-colors ${
                  noTime
                    ? 'border-[var(--accent)] text-on-dark'
                    : 'border-on-dark/25 text-on-dark-muted'
                }`}
              >
                <span
                  className={`size-3 rounded-full border ${noTime ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-on-dark/50'}`}
                />
                {ui.noTime}
              </button>
            </OnboardStep>
          )}
          {step === 'place' && (
            <PlaceStep
              locale={locale}
              selected={place}
              onSelect={setPlace}
              onNext={save}
              onSkip={() => {
                setPlace(null);
                save();
              }}
            />
          )}
          {step === 'reveal' && chart && (
            <Reveal
              locale={locale}
              chart={chart}
              signBy={signBy}
              onContinue={() => {
                setTab('today');
                setStep('app');
              }}
            />
          )}
          {step === 'app' && chart && profile && (
            <AppShell
              {...props}
              tab={tab}
              setTab={setTab}
              chart={chart}
              profile={profile}
              signBy={signBy}
              openGlossary={openGlossary}
              openSettings={() => setSettingsOpen(true)}
              here={here}
              onLocate={locate}
              onAddPlace={() => edit(profile.time ? 'place' : 'time')}
            />
          )}
        </main>

        <GlossarySheet
          locale={locale}
          which={glossary}
          onClose={() => setGlossary(null)}
          onPick={setGlossary}
        />
        {profile && (
          <SettingsSheet
            locale={locale}
            open={settingsOpen}
            profile={profile}
            onClose={() => setSettingsOpen(false)}
            onEdit={edit}
            onReplayIntro={() => {
              setSettingsOpen(false);
              setStep('intro');
            }}
            onForget={forget}
            accountHref={props.accountHref}
          />
        )}
      </div>
    </CloudContext.Provider>
  );
}

/* ------------------------------------------------------------------ onboarding */

function Welcome({
  locale,
  onStart,
  here,
}: {
  locale: LocaleCode;
  onStart: () => void;
  here: Here;
}) {
  const t = SKY_LABELS[locale];
  return (
    <section className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-between pb-10 text-center">
      <LiveMoon size={250} lat={here.lat} lon={here.lon} className="sky-rise -mt-2" />
      <div className="sky-in">
        <p className="type-label mb-4 !text-[var(--accent)]">Antrina</p>
        <h1 className="font-display text-[46px] leading-[1.02] font-semibold md:text-[64px]">
          {t.title}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-on-dark/85">
          {t.intro}
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-3">
        <Button
          onPress={onStart}
          size="lg"
          className="h-13 w-full max-w-sm bg-on-dark text-[15px] text-text"
        >
          {t.start}
          <ArrowRightIcon />
        </Button>
        <WelcomeSignIn locale={locale} />
        <p className="text-[13px] text-on-dark-muted">{t.privacy}</p>
      </div>
    </section>
  );
}

function WelcomeSignIn({ locale }: { locale: LocaleCode }) {
  const { account, googleEnabled } = useContext(CloudContext);
  if (account || !googleEnabled) return null;
  const t = CLOUD_UI[locale];
  return (
    <p className="text-[14px] text-on-dark-muted">
      {t.haveAccount}{' '}
      <a
        href={googleLoginUrl()}
        className="inline-flex items-center gap-1.5 text-on-dark underline underline-offset-4"
      >
        <GoogleMark size={14} />
        {t.google}
      </a>
    </p>
  );
}

function Intro({ locale, onDone }: { locale: LocaleCode; onDone: () => void }) {
  const ui = SKY_UI[locale];
  const slides = INTRO_SLIDES[locale];
  const [i, setI] = useState(0);
  const slide = slides[i]!;
  const last = i === slides.length - 1;
  return (
    <section className="flex min-h-[calc(100dvh-80px)] flex-col justify-between pt-8 pb-10">
      <div key={i} className="sky-in">
        <p className="type-label !text-[var(--accent)]">
          {pad(i + 1)} / {pad(slides.length)}
        </p>
        <h2 className="font-display mt-6 text-[38px] leading-tight font-semibold md:text-[48px]">
          {slide.title}
        </h2>
        <p className="mt-6 text-[18px] leading-relaxed text-on-dark/90">{slide.body}</p>
        <div className="mt-10 flex justify-center">
          <IntroArt index={i} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onDone}
          className="text-[15px] text-on-dark-muted underline underline-offset-4"
        >
          {ui.skip}
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, k) => (
            <span
              key={k}
              className={`h-1 w-6 rounded-full ${k <= i ? 'bg-[var(--accent)]' : 'bg-on-dark/20'}`}
            />
          ))}
        </div>
        <Button
          onPress={() => (last ? onDone() : setI(i + 1))}
          size="lg"
          className="h-12 bg-on-dark px-6 text-[15px] text-text"
        >
          {last ? ui.startNow : ui.nextSlide}
        </Button>
      </div>
    </section>
  );
}

/** Ilustración simple de cada paso de la guía de inicio. */
function IntroArt({ index }: { index: number }) {
  if (index === 0) return <LiveMoon size={170} lat={LIMA.lat} lon={LIMA.lon} />;
  if (index === 1)
    return (
      <div className="sky-symbol flex gap-6 text-[40px] text-[var(--accent)]">
        <span>☉&#xFE0E;</span>
        <span className="text-on-dark/80">☽&#xFE0E;</span>
        <span className="text-on-dark/60">↑</span>
      </div>
    );
  if (index === 2) return <Orrery points={todayPoints(new Date())} mode="spin" size={260} />;
  return (
    <div className="flex items-end gap-2">
      {['cuarzo-rosado', 'amatista', 'citrino', 'jade'].map((id) => (
        <StoneImage
          key={id}
          src={STONE_LIBRARY[id]!.image}
          alt=""
          size={74}
          glow={STONE_LIBRARY[id]!.color}
        />
      ))}
    </div>
  );
}

function OnboardStep({
  title,
  note,
  cta,
  onNext,
  children,
}: {
  title: string;
  note: string;
  cta: string;
  onNext: () => void;
  children: ReactNode;
}) {
  return (
    <section className="sky-in flex min-h-[calc(100dvh-80px)] flex-col justify-between pt-10 pb-10">
      <div>
        <h2 className="type-label text-center !text-[13px] !text-on-dark">{title}</h2>
        <div className="mt-14">{children}</div>
      </div>
      <div className="flex flex-col items-center gap-5">
        <p className="max-w-sm text-center text-[14px] leading-relaxed text-on-dark/80">{note}</p>
        <Button onPress={onNext} size="lg" className="h-13 w-full bg-on-dark text-[15px] text-text">
          {cta}
        </Button>
      </div>
    </section>
  );
}

function PlaceStep({
  locale,
  selected,
  onSelect,
  onNext,
  onSkip,
}: {
  locale: LocaleCode;
  selected: Place | null;
  onSelect: (place: Place | null) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const ui = SKY_UI[locale];
  const [query, setQuery] = useState(selected ? selected.name : '');
  const [results, setResults] = useState<Place[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    if (selected && query === selected.name) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        setState('idle');
        return;
      }
      setState('loading');
      searchPlaces(query, locale, controller.signal)
        .then((list) => {
          setResults(list);
          setState('done');
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale, selected]);

  return (
    <section className="sky-in flex min-h-[calc(100dvh-80px)] flex-col justify-between pt-10 pb-10">
      <div>
        <h2 className="type-label text-center !text-[13px] !text-on-dark">{ui.placeTitle}</h2>
        <div className="mt-12 flex items-center border-b border-on-dark/25 pb-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) onSelect(null);
            }}
            placeholder={ui.placeHolder}
            autoComplete="off"
            className="w-full bg-transparent text-center font-display text-[30px] text-on-dark outline-none placeholder:text-on-dark/30"
          />
        </div>
        <div className="mt-4 flex flex-col">
          {state === 'loading' && (
            <p className="py-3 text-center text-[14px] text-on-dark-muted">{ui.searching}</p>
          )}
          {state === 'done' && results.length === 0 && (
            <p className="py-3 text-center text-[14px] text-on-dark-muted">{ui.noResults}</p>
          )}
          {!selected &&
            results.map((r) => (
              <button
                key={`${r.lat},${r.lon}`}
                type="button"
                onClick={() => {
                  onSelect(r);
                  setQuery(r.name);
                  setResults([]);
                }}
                className="rounded-md py-3 text-center font-display text-[18px] leading-snug transition-colors hover:bg-on-dark/5"
              >
                {r.name}
                <span className="block text-[15px] text-on-dark-muted">
                  {[r.region, r.country].filter(Boolean).join(', ')}
                </span>
              </button>
            ))}
          {selected && (
            <p className="py-3 text-center text-[15px] text-[var(--accent)]">
              {[selected.region, selected.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <p className="max-w-sm text-center text-[13px] leading-relaxed text-on-dark/75">
          {ui.placeNote}
        </p>
        <Button
          onPress={onNext}
          isDisabled={!selected}
          size="lg"
          className="h-13 w-full bg-on-dark text-[15px] text-text disabled:opacity-40"
        >
          {ui.continue}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-[14px] text-on-dark-muted underline underline-offset-4"
        >
          {ui.placeSkip}
        </button>
      </div>
    </section>
  );
}

/** Pantalla de revelación: tus tres grandes y tres frases, una a una. */
function Reveal({
  locale,
  chart,
  signBy,
  onContinue,
}: {
  locale: LocaleCode;
  chart: NatalChart;
  signBy: Map<SignCode, SkySign>;
  onContinue: () => void;
}) {
  const ui = SKY_UI[locale];
  const sun = sunOf(chart).sign;
  const moon = moonOf(chart).sign;
  const asc = chart.ascendant?.sign ?? null;
  const lines = [
    REVEAL_LINES[sun][locale][0],
    REVEAL_LINES[moon][locale][1],
    REVEAL_LINES[asc ?? sun][locale][2],
  ];
  const [shown, setShown] = useState(0);
  // Primero los planetas giran y se acomodan en tu carta; luego aparecen tus tres grandes.
  const [calculating, setCalculating] = useState(true);
  useEffect(() => {
    const done = window.setTimeout(() => setCalculating(false), 3600);
    const timers = lines.map((_, i) =>
      window.setTimeout(() => setShown(i + 1), 3600 + 900 + i * 1100),
    );
    return () => {
      window.clearTimeout(done);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [lines.length]);
  if (calculating)
    return (
      <section className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center gap-10 text-center">
        <Orrery
          points={chart.placements.map((p) => ({
            planet: p.point as Planet,
            longitude: p.longitude,
          }))}
          ascendant={chart.ascendant?.longitude ?? null}
          mode="settle"
          size={320}
        />
        <p className="type-label !text-on-dark">{SKY_LABELS[locale].reading}</p>
      </section>
    );
  return (
    <section className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-between pb-10 text-center">
      <img
        src="/world/sky/planets/sun.webp"
        alt=""
        className="sky-rise -mt-6 w-[220px]"
        style={{ filter: 'drop-shadow(0 0 40px rgba(255,170,70,.55))' }}
      />
      <div>
        <BigThree chart={chart} signBy={signBy} />
        <p className="font-display mt-3 text-[18px] text-[var(--accent)]">
          “{SIGN_STONE[sun].motto[locale]}” · {signStone(sun).name[locale]}
        </p>
        <div className="mt-10 flex min-h-[170px] flex-col gap-4">
          {lines.slice(0, shown).map((line) => (
            <p key={line} className="sky-fade font-display text-[30px] leading-tight">
              {line}
            </p>
          ))}
        </div>
        {shown >= 3 && (
          <p className="type-label sky-fade mx-auto mt-8 max-w-xs !text-on-dark-muted">
            {ui.revealNote}
          </p>
        )}
      </div>
      <Button
        onPress={onContinue}
        size="lg"
        className="h-13 w-full max-w-sm bg-on-dark text-[15px] text-text"
      >
        {ui.continue}
      </Button>
    </section>
  );
}

function BigThree({ chart, signBy }: { chart: NatalChart; signBy: Map<SignCode, SkySign> }) {
  const items: [string, SignCode][] = [
    ['☉︎', sunOf(chart).sign],
    ['☽︎', moonOf(chart).sign],
  ];
  if (chart.ascendant) items.push(['↑', chart.ascendant.sign]);
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[15px] tracking-wide">
      {items.map(([glyph, code]) => (
        <span key={glyph} className="flex items-center gap-1.5">
          <span className="sky-symbol" style={{ color: ELEMENT_COLOR[ELEMENT_OF[code]] }}>
            {glyph}
          </span>
          {signBy.get(code)?.label}
        </span>
      ))}
    </p>
  );
}

/* ------------------------------------------------------------------ app con pestañas */

function AppShell({
  locale,
  tab,
  setTab,
  chart,
  profile,
  signBy,
  products,
  intentionLabel,
  createTreeHref,
  homeHref,
  accountHref,
  openGlossary,
  openSettings,
  onAddPlace,
  here,
  onLocate,
}: SkyProps & {
  tab: Tab;
  setTab: (tab: Tab) => void;
  chart: NatalChart;
  profile: Profile;
  signBy: Map<SignCode, SkySign>;
  openGlossary: (key: GlossaryKey | 'all') => void;
  openSettings: () => void;
  onAddPlace: () => void;
  here: Here;
  onLocate: () => void;
}) {
  const ui = SKY_UI[locale];
  const tabs: [Tab, string][] = [
    ['today', ui.nav.today],
    ['chart', ui.nav.chart],
    ['ask', ui.nav.ask],
    ['bonds', ui.nav.bonds],
    ['shop', ui.nav.stones],
  ];
  const [product, setProduct] = useState<SkyProduct | null>(null);
  const [stoneSheet, setStoneSheet] = useState<string | null>(null);
  const signInfo = useMemo(() => [...signBy.values()], [signBy]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);
  return (
    <StoneContext.Provider value={setStoneSheet}>
      <header className="flex items-center justify-between pt-5 pb-2">
        <a href={homeHref} className="type-label !text-on-dark">
          Antrina · <span className="!text-[var(--accent)]">{SKY_LABELS[locale].title}</span>
        </a>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openGlossary('all')}
            className="text-[13px] text-on-dark-muted underline decoration-on-dark/30 underline-offset-[6px]"
          >
            {ui.guide}
          </button>
          <AccountChip locale={locale} accountHref={accountHref} />
        </div>
      </header>
      <div key={tab} className="sky-in flex flex-col gap-5 pt-6 pb-36">
        {tab === 'today' && (
          <Today
            locale={locale}
            chart={chart}
            signBy={signBy}
            openGlossary={openGlossary}
            here={here}
            onLocate={onLocate}
          />
        )}
        {tab === 'today' && <CloudNudge locale={locale} />}
        {tab === 'chart' && (
          <ChartView
            locale={locale}
            chart={chart}
            profile={profile}
            signBy={signBy}
            openGlossary={openGlossary}
            openSettings={openSettings}
            onAddPlace={onAddPlace}
          />
        )}
        {tab === 'ask' && <Ask locale={locale} chart={chart} />}
        {tab === 'bonds' && <Bonds locale={locale} chart={chart} signBy={signBy} />}
        {tab === 'shop' && (
          <ShopTab
            locale={locale}
            chart={chart}
            signs={signInfo}
            products={products}
            intentionLabel={intentionLabel}
            createTreeHref={createTreeHref}
            onProduct={setProduct}
            onStone={setStoneSheet}
          />
        )}
      </div>
      <TabDock tabs={tabs} tab={tab} setTab={setTab} label={SKY_LABELS[locale].title} />
      <StoneSheet
        locale={locale}
        stoneId={stoneSheet}
        signs={signInfo}
        products={products}
        onClose={() => setStoneSheet(null)}
        onProduct={setProduct}
      />
      <ProductSheet locale={locale} product={product} onClose={() => setProduct(null)} />
    </StoneContext.Provider>
  );
}

/* ------------------------------------------------------------------ hoy */

const NATURE_VERB: Record<LocaleCode, Record<Nature, string>> = {
  es: { flow: 'se armoniza con', tension: 'pone a prueba', blend: 'se funde con' },
  en: { flow: 'harmonizes with', tension: 'tests', blend: 'merges with' },
};

function bodyName(point: Placement['point'] | Planet, locale: LocaleCode) {
  return BODY_INFO[point].name[locale];
}

function Today({
  locale,
  chart,
  signBy,
  openGlossary,
  here,
  onLocate,
}: {
  locale: LocaleCode;
  chart: NatalChart;
  signBy: Map<SignCode, SkySign>;
  openGlossary: (key: GlossaryKey) => void;
  here: Here;
  onLocate: () => void;
}) {
  const openStone = useContext(StoneContext);
  const ui = SKY_UI[locale];
  const t = SKY_LABELS[locale];
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const [selected, setSelected] = useState(today);
  const deeper = useRef<HTMLDivElement>(null);
  const key = dayKey(selected);
  const sky = skyOfDay(selected);
  const sunSign = sunOf(chart).sign;
  const transit: Transit | undefined = transitsFor(chart, selected)[0];
  const nature: Nature = transit ? ASPECT_INFO[transit.aspect].nature : 'blend';
  const daily = DAILY[nature][locale];
  const glance = daily[seededIndex(`${key}-${sunSign}-glance`, daily.length)]!;
  const pool = DO_DONT[locale];
  const pickThree = (list: string[], salt: string) => {
    const out: string[] = [];
    for (let k = 0; out.length < 3 && k < 12; k++) {
      const item = list[seededIndex(`${key}-${sunSign}-${salt}-${k}`, list.length)]!;
      if (!out.includes(item)) out.push(item);
    }
    return out;
  };
  const dayStone = signStone(sunSign).name[locale];
  const dos = pickThree(pool.do, 'do');
  if (!dos.includes(dayStone)) dos[2] = dayStone;
  // La Luna de hoy se dibuja en este instante; la de otros días, a medianoche de ese día.
  const isToday = selected.getTime() === today.getTime();
  const moonDate = useMemo(
    () =>
      isToday
        ? new Date()
        : new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 21),
    [isToday, selected],
  );
  const mv = moonView(moonDate, here.lat, here.lon);
  const mu = MOON_UI[locale];
  const donts = pickThree(pool.dont, 'dont');
  const days = range(-3, 3).map(
    (o) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + o),
  );
  const tone = elementHarmony(ELEMENT_OF[sunSign], ELEMENT_OF[sky.moon]);

  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const active = d.getTime() === selected.getTime();
          return (
            <button
              key={d.getTime()}
              type="button"
              onClick={() => setSelected(d)}
              className="flex flex-col items-center gap-2 py-1"
            >
              <span className="text-[12px] text-on-dark-muted">{t.weekdays[d.getDay()]}</span>
              <span
                className={`flex size-10 items-center justify-center rounded-full text-[15px] transition-colors ${
                  active
                    ? 'bg-[var(--accent)] font-semibold text-black'
                    : d.getTime() === today.getTime()
                      ? 'border border-on-dark/50'
                      : 'text-on-dark/85'
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <section className="relative pt-4">
        <LiveMoon
          size={140}
          lat={here.lat}
          lon={here.lon}
          date={moonDate}
          className="absolute -top-2 right-0"
        />
        <p className="type-label mt-28 !text-on-dark">{ui.glance}</p>
        <h1 className="font-display mt-3 text-[42px] leading-[1.05] font-semibold">
          {glance.headline}
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-on-dark/90">{glance.body}</p>
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[13px] text-on-dark-muted">{ui.do}</p>
            {dos.map((item) => (
              <p key={item} className="font-display mt-2 text-[22px] leading-tight">
                {item}
              </p>
            ))}
          </div>
          <div>
            <p className="text-[13px] text-on-dark-muted">{ui.dont}</p>
            {donts.map((item) => (
              <p key={item} className="font-display mt-2 text-[22px] leading-tight text-on-dark/75">
                {item}
              </p>
            ))}
          </div>
        </div>
        <Button
          onPress={() => deeper.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          size="lg"
          className="mt-8 h-12 bg-on-dark px-7 text-[14px] tracking-[0.12em] text-text uppercase"
        >
          {ui.deeper}
          <ArrowRightIcon />
        </Button>
      </section>

      <div ref={deeper} className="flex scroll-mt-6 flex-col gap-5 pt-6">
        <Panel>
          <p className="type-label !text-on-dark-muted">{ui.transitTitle}</p>
          {transit ? (
            <>
              <div className="mt-4 flex items-center justify-between gap-2">
                <TransitBody
                  planet={transit.transiting}
                  caption={`${bodyName(transit.transiting, locale)}`}
                  sub={ui.transiting}
                />
                <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <AspectIcon kind={transit.aspect} />
                  <span className="text-[12px] tracking-[0.06em] text-on-dark-muted uppercase">
                    {ASPECT_INFO[transit.aspect].name[locale]}
                  </span>
                </div>
                <TransitBody
                  planet={transit.natal}
                  caption={`${bodyName(transit.natal, locale)}`}
                  sub={ui.natal}
                />
              </div>
              <p className="font-display mt-4 text-[21px] leading-snug">
                {bodyName(transit.transiting, locale)} {ui.transiting}{' '}
                {ASPECT_INFO[transit.aspect].name[locale].toLowerCase()} {ui.toYour}{' '}
                {bodyName(transit.natal, locale)} {ui.natal}
              </p>
              <p className="mt-4 text-[16px] leading-relaxed text-on-dark/90">
                {capitalize(TRANSIT_TEXT[transit.transiting as keyof typeof TRANSIT_TEXT][locale])}{' '}
                {NATURE_VERB[locale][nature]}{' '}
                {NATAL_TEXT[transit.natal as keyof typeof NATAL_TEXT][locale]}.{' '}
                {ASPECT_INFO[transit.aspect].meaning[locale]}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[16px] leading-relaxed text-on-dark/90">{ui.noTransit}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <InfoButton label={ui.whatMeans} onPress={() => openGlossary('transits')} />
            <InfoButton label={SKY_UI[locale].nav.chart} onPress={() => openGlossary('aspects')} />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-4">
            <LiveMoon size={84} lat={here.lat} lon={here.lon} date={moonDate} />
            <div>
              <p className="type-label !text-on-dark-muted">
                {PHASE_LABEL[sky.phase][locale]} · {Math.round(mv.illumination * 100)}%
              </p>
              <p className="font-display mt-1 text-[22px] leading-tight font-semibold">
                {ui.moonToday} {signBy.get(sky.moon)?.label}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-on-dark/10 px-4 py-3 text-[13px] text-on-dark-muted">
            <span>
              {mu.from} {here.label} ·{' '}
              {mv.altitude > 0
                ? `${mu.up(Math.round(mv.altitude), compass(mv.azimuth, locale))}`
                : mu.down}
            </span>
            {!here.precise && (
              <button
                type="button"
                onClick={onLocate}
                className="text-on-dark underline underline-offset-4"
              >
                {mu.locate}
              </button>
            )}
          </div>
          <p className="mt-4 text-[16px] leading-relaxed text-on-dark/90">
            {MOON_DAY[sky.moon][locale].mood}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--accent)]">
            {MOON_DAY[sky.moon][locale].tip}
          </p>
          <p className="mt-3 text-[13px] text-on-dark-muted">
            {t.todayMoon && TONE_TEXT[locale][tone]}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <InfoButton label={ui.whatMeans} onPress={() => openGlossary('moon')} />
            <InfoButton
              label={PHASE_LABEL[sky.phase][locale]}
              onPress={() => openGlossary('phases')}
            />
          </div>
        </Panel>

        {AREAS.map((area) => {
          const content = AREA_CONTENT[area];
          const lines = content.lines[locale][tone];
          const line = lines[seededIndex(`${key}-${sunSign}-${area}`, lines.length)]!;
          const pool2 = AREA_STONES[area];
          const stone =
            STONE_LIBRARY[pool2[seededIndex(`${key}-${sunSign}-${area}-stone`, pool2.length)]!]!;
          return (
            <Panel key={area}>
              <p className="type-label !text-[var(--accent)]">{content.label[locale]}</p>
              <p className="mt-3 text-[17px] leading-relaxed">{line}</p>
              <button
                type="button"
                onClick={() => openStone(stone.id)}
                className="mt-4 flex w-full items-center gap-4 rounded-md border border-on-dark/15 px-3 py-2 text-left transition-colors hover:border-on-dark/40"
              >
                <StoneImage src={stone.image} alt="" size={58} glow={stone.color} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[12px] text-on-dark-muted">{t.stoneForToday}</span>
                  <span className="text-[15px] font-medium">{stone.name[locale]}</span>
                </span>
                <ArrowRightIcon />
              </button>
            </Panel>
          );
        })}
      </div>
    </>
  );
}

const TONE_TEXT: Record<LocaleCode, [string, string, string]> = {
  es: [
    'Para tu Sol, esta Luna trae un poco de roce: ve con calma.',
    'Para tu Sol, esta Luna es neutral: el día depende de ti.',
    'Para tu Sol, esta Luna fluye: aprovecha la buena sintonía.',
  ],
  en: [
    'For your Sun, this Moon brings some friction: go gently.',
    'For your Sun, this Moon is neutral: the day is yours to shape.',
    'For your Sun, this Moon flows: enjoy the good tune.',
  ],
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------------------------ barra inferior */

const TAB_ICON: Record<Tab, ReactNode> = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  chart: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5" />
    </>
  ),
  ask: (
    <>
      <path d="M4.5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19.5 7v7a2.5 2.5 0 0 1-2.5 2.5H8.5z" />
      <path d="M12 7.5v3.5M10.25 9.25h3.5" />
    </>
  ),
  bonds: (
    <>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
  shop: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
    </>
  ),
};

/** Barra flotante de cristal; la gota de luz se desliza (y se estira) hasta la pestaña activa. */
function TabDock({
  tabs,
  tab,
  setTab,
  label,
}: {
  tabs: [Tab, string][];
  tab: Tab;
  setTab: (tab: Tab) => void;
  label: string;
}) {
  const index = Math.max(
    0,
    tabs.findIndex(([key]) => key === tab),
  );
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 z-30 flex justify-center px-3"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="sky-dock relative w-full max-w-[460px] rounded-[30px] border border-white/15 p-1.5">
        <div
          className="sky-drop pointer-events-none absolute inset-y-1.5 left-1.5"
          style={{
            width: `calc((100% - 12px) / ${tabs.length})`,
            transform: `translateX(${index * 100}%)`,
          }}
          aria-hidden="true"
        >
          <span key={tab} className="block h-full w-full rounded-[24px]" />
        </div>
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        >
          {tabs.map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`sky-tab flex flex-col items-center gap-0.5 rounded-[24px] py-2 text-[11px] font-medium tracking-[0.01em] transition-colors duration-300 ${
                tab === key ? 'text-white' : 'text-white/55 hover:text-white/80'
              }`}
            >
              <svg {...iconProps} width={22} height={22} className="sky-tab-icon">
                {TAB_ICON[key]}
              </svg>
              {text}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ carta */

function ChartView({
  locale,
  chart,
  profile,
  signBy,
  openGlossary,
  openSettings,
  onAddPlace,
}: {
  locale: LocaleCode;
  chart: NatalChart;
  profile: Profile;
  signBy: Map<SignCode, SkySign>;
  openGlossary: (key: GlossaryKey) => void;
  openSettings: () => void;
  onAddPlace: () => void;
}) {
  const openStone = useContext(StoneContext);
  const ui = SKY_UI[locale];
  const [detail, setDetail] = useState<Placement | null>(null);
  const all = chart.ascendant ? [chart.ascendant, ...chart.placements] : chart.placements;
  const groups = SIGN_CODES.map((code) => ({
    code,
    items: all.filter((p) => p.sign === code),
  })).filter((g) => g.items.length > 0);
  const sun = sunOf(chart);
  const moon = moonOf(chart);
  const elements = (['fire', 'earth', 'air', 'water'] as Element[]).map((el) => ({
    el,
    count: all.filter((p) => ELEMENT_OF[p.sign] === el).length,
  }));
  const maxCount = Math.max(...elements.map((e) => e.count), 1);

  return (
    <>
      <section className="flex flex-col items-center text-center">
        <Orrery
          points={chart.placements.map((p) => ({
            planet: p.point as Planet,
            longitude: p.longitude,
          }))}
          ascendant={chart.ascendant?.longitude ?? null}
          mode="settle"
          size={300}
        />
        <h1 className="font-display mt-4 text-[34px] font-semibold">{ui.nav.chart}</h1>
        <div className="mt-2">
          <BigThree chart={chart} signBy={signBy} />
        </div>
        <p className="mt-2 text-[13px] text-on-dark-muted">
          {new Date(`${profile.date}T12:00`).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          {profile.time ? ` · ${profile.time}` : ''}
          {profile.place ? ` · ${profile.place.name}` : ''}
        </p>
        <button
          type="button"
          onClick={openSettings}
          className="mt-3 text-[13px] text-on-dark-muted underline underline-offset-4"
        >
          {ui.settings}
        </button>
      </section>

      <Panel>
        <button
          type="button"
          onClick={() => openStone(signStone(sun.sign).id)}
          className="flex w-full items-center gap-4 text-left"
        >
          <StoneImage
            src={signStone(sun.sign).image}
            alt=""
            size={84}
            glow={signStone(sun.sign).color}
          />
          <div className="min-w-0">
            <p className="type-label !text-[var(--accent)]">
              {signBy.get(sun.sign)?.label} · “{SIGN_STONE[sun.sign].motto[locale]}”
            </p>
            <p className="font-display mt-1 text-[22px] leading-tight font-semibold">
              {signStone(sun.sign).name[locale]}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-on-dark/80">
              {signStone(sun.sign).meaning[locale]}
            </p>
          </div>
        </button>
      </Panel>

      {!chart.ascendant && (
        <Panel>
          <p className="text-[15px] leading-relaxed text-on-dark/85">{ui.noHouses}</p>
          <button
            type="button"
            onClick={onAddPlace}
            className="mt-3 text-[14px] font-medium text-[var(--accent)] underline underline-offset-4"
          >
            {ui.addPlace}
          </button>
        </Panel>
      )}

      <div className="flex items-start gap-2">
        <span className="type-label mt-3 !text-[10px] [writing-mode:vertical-rl] !text-on-dark-muted">
          {ui.signs}
        </span>
        <div className="flex-1 overflow-hidden rounded-md border border-on-dark/15">
          {groups.map((group) => (
            <div
              key={group.code}
              className="grid grid-cols-[0.9fr_1.4fr_0.45fr] border-b border-on-dark/10 last:border-b-0"
            >
              <div className="border-r border-on-dark/10 px-3 py-3 text-[15px]">
                {signBy.get(group.code)?.label}
              </div>
              <div className="col-span-2 flex flex-col">
                {group.items.map((p) => (
                  <button
                    key={p.point}
                    type="button"
                    onClick={() => setDetail(p)}
                    className="grid grid-cols-[1.4fr_0.45fr] items-center text-left transition-colors hover:bg-on-dark/5"
                  >
                    <span className="flex items-center gap-2 bg-on-dark/[0.04] px-3 py-3 text-[13px] tracking-[0.08em] uppercase">
                      <span
                        className="sky-symbol w-4 text-center text-[15px]"
                        style={{ color: ELEMENT_COLOR[ELEMENT_OF[p.sign]] }}
                      >
                        {BODY_INFO[p.point].glyph}
                      </span>
                      {bodyName(p.point, locale)}
                      {p.retrograde && <span className="text-[10px] text-on-dark-muted">R</span>}
                    </span>
                    <span className="border-l border-on-dark/10 px-3 py-2 text-right font-display text-[24px] leading-none">
                      {p.house ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <span className="type-label mt-auto mb-3 !text-[10px] [writing-mode:vertical-rl] !text-on-dark-muted">
          {ui.houses}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <InfoButton label={ui.planets} onPress={() => openGlossary('planets')} />
        <InfoButton label={ui.houses} onPress={() => openGlossary('houses')} />
        <InfoButton label="↑" onPress={() => openGlossary('ascendant')} />
      </div>

      <Panel>
        <p className="type-label !text-on-dark-muted">{SKY_LABELS[locale].element}</p>
        <div className="mt-4 flex flex-col gap-3">
          {elements.map(({ el, count }) => (
            <div key={el} className="flex items-center gap-3">
              <span className="w-16 text-[14px]">{ELEMENT_LABEL[el][locale]}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-on-dark/10">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    backgroundColor: ELEMENT_COLOR[el],
                  }}
                />
              </span>
              <span className="w-4 text-right text-[13px] text-on-dark-muted">{count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <InfoButton label={SKY_UI[locale].whatMeans} onPress={() => openGlossary('elements')} />
        </div>
      </Panel>

      {[sun, moon].map((p) => (
        <Panel key={p.point}>
          <p className="flex items-center gap-3 border-b border-on-dark/10 pb-4">
            <span className="sky-symbol text-[22px] text-[var(--accent)]">
              {BODY_INFO[p.point].glyph}
            </span>
            <span className="font-display text-[24px] font-semibold">
              {bodyName(p.point, locale)} {ui.inSign} {signBy.get(p.sign)?.label}
            </span>
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-on-dark/90">
            {p.point === 'sun' ? SIGN_SKY[p.sign].sun[locale] : SIGN_SKY[p.sign].moon[locale]}
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-on-dark/10 pt-4">
            {[
              [SKY_LABELS[locale].element, ELEMENT_LABEL[ELEMENT_OF[p.sign]][locale]],
              [SKY_LABELS[locale].modality, MODALITY_LABEL[MODALITY_OF[p.sign]][locale]],
              [SKY_LABELS[locale].ruler, SIGN_SKY[p.sign].ruler[locale]],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="type-label !text-[10px] !text-on-dark-muted">{k}</dt>
                <dd className="mt-1 text-[14px]">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      ))}
      <a
        href={signBy.get(sun.sign)?.href}
        className="inline-flex items-center gap-2 self-start text-[15px] font-medium text-[var(--accent)] underline underline-offset-[6px]"
      >
        {SKY_LABELS[locale].seeSignTrees} <ArrowRightIcon />
      </a>

      <Sheet
        open={detail !== null}
        title={
          detail
            ? `${bodyName(detail.point, locale)} ${ui.inSign} ${signBy.get(detail.sign)?.label}`
            : ''
        }
        onClose={() => setDetail(null)}
        closeLabel={ui.close}
      >
        {detail && (
          <div className="flex flex-col gap-4 text-[16px] leading-relaxed text-on-dark/90">
            <p>{BODY_INFO[detail.point].meaning[locale]}</p>
            <p>
              <span className="type-label !text-[var(--accent)]">
                {signBy.get(detail.sign)?.label}
              </span>
              <br />
              {SIGN_SKY[detail.sign].keywords[locale].join(' · ')} —{' '}
              {ELEMENT_LABEL[ELEMENT_OF[detail.sign]][locale]},{' '}
              {MODALITY_LABEL[MODALITY_OF[detail.sign]][locale].toLowerCase()}.
            </p>
            {detail.house && (
              <p>
                <span className="type-label !text-[var(--accent)]">
                  {ui.inHouse} {detail.house}
                </span>
                <br />
                {HOUSE_INFO[locale][detail.house - 1]}
              </p>
            )}
            {detail.retrograde && (
              <p className="text-[14px] text-on-dark-muted">
                {bodyName(detail.point, locale)} {ui.retro}.
              </p>
            )}
            <p className="text-[13px] text-on-dark-muted">
              {detail.degree.toFixed(0)}° {signBy.get(detail.sign)?.label}
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ preguntar */

const TOPICS: AskTopic[] = ['self', 'love', 'work', 'money'];
const TOPIC_ICON: Record<AskTopic, ReactNode> = {
  self: <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />,
  love: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  work: <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" />,
  money: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
};

/** Planeta con foto y su papel en el tránsito. */
function TransitBody({
  planet,
  caption,
  sub,
}: {
  planet: Placement['point'] | Planet;
  caption: string;
  sub: string;
}) {
  return (
    <div className="flex w-[30%] flex-col items-center gap-1 text-center">
      <span className="flex size-16 items-center justify-center">
        <PlanetImg planet={planet} className="max-h-16 max-w-16" />
      </span>
      <span className="text-[14px] font-medium">{caption}</span>
      <span className="text-[11px] leading-tight text-on-dark-muted">{sub}</span>
    </div>
  );
}

/** Dibujo del aspecto (sin caracteres especiales: en algunos teléfonos salen como cuadros). */
function AspectIcon({ kind }: { kind: Transit['aspect'] }) {
  const common = {
    width: 44,
    height: 44,
    viewBox: '-22 -22 44 44',
    fill: 'none',
    stroke: 'var(--accent)',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  return (
    <svg {...common}>
      <circle r="20" stroke="currentColor" strokeOpacity="0.15" />
      {kind === 'conjunction' && (
        <>
          <circle cx="-4" r="7" />
          <circle cx="4" r="7" />
        </>
      )}
      {kind === 'sextile' && <path d="M0-11V11M-9.5-5.5 9.5 5.5M-9.5 5.5 9.5-5.5" />}
      {kind === 'square' && (
        <>
          <path d="M-9 9V-9H9" />
          <path d="M-9-3h6v-6" strokeOpacity="0.6" />
        </>
      )}
      {kind === 'trine' && <path d="M0-11 10 7H-10z" />}
      {kind === 'opposition' && (
        <>
          <circle cx="-10" r="3.5" />
          <circle cx="10" r="3.5" />
          <path d="M-6.5 0h13" />
        </>
      )}
    </svg>
  );
}

/** Foto del planeta (Plutón no tiene foto: un punto). */
function PlanetImg({
  planet,
  className = '',
}: {
  planet: Placement['point'] | Planet;
  className?: string;
}) {
  if (planet === 'pluto' || planet === 'ascendant')
    return (
      <span
        className={`block aspect-square rounded-full bg-[#b9a89a]/70 ${className}`}
        style={{ width: 22 }}
      />
    );
  return <img src={`/world/sky/planets/${planet}.webp`} alt="" className={className} />;
}

function Ask({ locale, chart }: { locale: LocaleCode; chart: NatalChart }) {
  const openStone = useContext(StoneContext);
  const ui = SKY_UI[locale];
  const [topic, setTopic] = useState<AskTopic>('self');
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'answer'>('idle');
  const [asked, setAsked] = useState<AskEntry | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [history, setHistory] = useState<AskEntry[]>(() => readJson<AskEntry[]>(ASK_KEY) ?? []);
  const { recordQuestion } = useContext(CloudContext);

  const ask = (question: string, entryTopic = topic, dayStr = dayKey(new Date())) => {
    const q = question.trim();
    if (!q) return;
    const entry = { question: q, topic: entryTopic, day: dayStr };
    setAsked(entry);
    setFeedback(null);
    setPhase('thinking');
    setText('');
    const next = [entry, ...history.filter((h) => h.question !== q)].slice(0, 8);
    setHistory(next);
    writeJson(ASK_KEY, next);
    recordQuestion(entry);
    window.setTimeout(() => setPhase('answer'), 3200);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const points = useMemo(() => todayPoints(new Date()), []);

  if (phase !== 'idle' && asked) {
    const transit = transitsFor(chart, new Date(`${asked.day}T12:00`))[0];
    const nature: Nature = transit ? ASPECT_INFO[transit.aspect].nature : 'blend';
    const answers = ASK_ANSWERS[asked.topic][nature][locale];
    const answer = answers[seededIndex(`${asked.question}-${asked.day}`, answers.length)]!;
    const stoneIds = AREA_STONES[asked.topic === 'self' ? 'luck' : asked.topic];
    const stone =
      STONE_LIBRARY[stoneIds[seededIndex(`${asked.question}-stone`, stoneIds.length)]!]!;
    return (
      <section className="flex flex-col gap-0">
        <div className="rounded-t-md border border-on-dark/70 px-6 py-6 text-center">
          <p className="type-label !text-on-dark">{ui.youAsked}:</p>
          <p className="mt-4 text-[16px] tracking-[0.06em] uppercase">“{asked.question}”</p>
        </div>
        {phase === 'thinking' ? (
          <div className="sky-fade flex flex-col items-center gap-6 pt-8 text-center">
            <Orrery points={points} mode="spin" size={280} />
            <p className="type-label max-w-xs !text-on-dark">{ui.thinking}</p>
          </div>
        ) : (
          <div className="sky-in border-x border-b border-on-dark/70">
            <div className="grid grid-cols-2 border-b border-on-dark/70">
              <div className="flex items-center justify-center border-r border-on-dark/70 py-6">
                {transit ? (
                  <div className="relative h-36 w-28">
                    <PlanetImg planet={transit.transiting} className="absolute top-0 left-0 w-16" />
                    <span className="absolute top-[46%] left-1/2 h-px w-10 -translate-x-1/2 rotate-[50deg] bg-on-dark/40" />
                    <PlanetImg planet={transit.natal} className="absolute right-0 bottom-0 w-14" />
                  </div>
                ) : (
                  <img src="/world/sky/planets/moon.webp" alt="" className="w-20" />
                )}
              </div>
              <p className="flex items-center px-4 py-6 text-center text-[13px] leading-relaxed tracking-[0.08em] uppercase">
                {transit
                  ? `${bodyName(transit.transiting, locale)} ${ui.transiting} ${ASPECT_INFO[transit.aspect].name[locale].toLowerCase()} ${ui.toYour} ${bodyName(transit.natal, locale)} ${ui.natal}`
                  : ui.noTransit}
              </p>
            </div>
            <p className="px-6 py-7 text-[17px] leading-[1.75] text-on-dark/95">{answer}</p>
            <button
              type="button"
              onClick={() => openStone(stone.id)}
              className="mx-6 mb-6 flex w-[calc(100%-48px)] items-center gap-4 rounded-md border border-on-dark/20 px-3 py-2 text-left"
            >
              <StoneImage src={stone.image} alt="" size={64} glow={stone.color} />
              <span className="flex flex-1 flex-col">
                <span className="text-[12px] text-on-dark-muted">{ui.stoneHint}</span>
                <span className="text-[15px] font-medium">{stone.name[locale]}</span>
              </span>
              <ArrowRightIcon />
            </button>
            <div className="flex items-center justify-between border-t border-on-dark/70 px-6 py-5">
              <p className="text-[13px] tracking-[0.08em] uppercase">
                {feedback ? ui.thanks : ui.helpful}
              </p>
              <div className="flex gap-4">
                {(['up', 'down'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={v}
                    onClick={() => setFeedback(v)}
                    className={feedback === v ? 'text-[var(--accent)]' : 'text-on-dark'}
                  >
                    <svg
                      {...iconProps}
                      style={v === 'down' ? { transform: 'rotate(180deg)' } : undefined}
                    >
                      <path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.8 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {phase === 'answer' && (
          <Button
            onPress={() => setPhase('idle')}
            size="lg"
            className="mx-auto mt-4 h-12 bg-on-dark px-10 text-[14px] tracking-[0.12em] text-text uppercase"
          >
            {ui.dismiss}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="type-label text-center !text-[13px] !text-on-dark">{ui.askTitle}</h1>
      <div className="grid grid-cols-4 gap-2">
        {TOPICS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTopic(key)}
            className={`flex flex-col items-center gap-2 rounded-md border py-4 text-[12px] tracking-[0.12em] uppercase transition-colors ${
              topic === key
                ? 'border-on-dark/80 text-on-dark'
                : 'border-transparent text-on-dark-muted'
            }`}
          >
            <svg {...iconProps} width={30} height={30} strokeWidth={1.2}>
              {TOPIC_ICON[key]}
            </svg>
            {ASK_QUESTIONS[key].label[locale]}
          </button>
        ))}
      </div>
      <div key={topic} className="sky-in flex flex-col items-center gap-6 py-2 text-center">
        {ASK_QUESTIONS[topic].questions[locale].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            className="text-[15px] leading-snug tracking-[0.04em] text-on-dark underline decoration-on-dark/50 underline-offset-[6px] hover:decoration-[var(--accent)]"
          >
            {q}
          </button>
        ))}
      </div>
      {history.length > 0 && (
        <div>
          <p className="type-label mb-3 !text-on-dark-muted">{ui.history}</p>
          <div className="flex flex-col divide-y divide-on-dark/10 border-y border-on-dark/10">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.question}
                type="button"
                onClick={() => ask(h.question, h.topic, h.day)}
                className="py-3 text-left text-[14px] text-on-dark/85"
              >
                {h.question}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* En un portal: así queda fija sobre la barra inferior aunque la pantalla esté animada. */}
      {createPortal(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="sky-root fixed inset-x-0 z-20 border-t border-white/10 !bg-black/85 text-on-dark backdrop-blur-xl"
          style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto flex max-w-[560px] items-center gap-3 px-5 py-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={ui.askPlaceholder}
              maxLength={140}
              className="h-11 flex-1 bg-transparent text-[16px] text-on-dark outline-none placeholder:text-[14px] placeholder:tracking-[0.04em] placeholder:text-on-dark-muted placeholder:uppercase"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="h-11 rounded-md bg-on-dark px-5 text-[13px] tracking-[0.12em] text-text uppercase disabled:bg-on-dark/15 disabled:text-on-dark-muted"
            >
              {ui.askCta}
            </button>
          </div>
        </form>,
        document.body,
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ vínculos */

/** Guardar a la persona comparada en los vínculos de la cuenta. */
function BondSave({
  other,
  saved,
  onSaved,
  locale,
}: {
  other: { name: string; birthDate: string };
  saved: boolean;
  onSaved: () => void;
  locale: LocaleCode;
}) {
  const cloud = useContext(CloudContext);
  const c = CLOUD_UI[locale];
  const [busy, setBusy] = useState(false);
  if (!cloud.account) {
    if (!cloud.googleEnabled) return null;
    return (
      <a
        href={googleLoginUrl()}
        className="mt-5 inline-flex items-center gap-2 text-[14px] text-on-dark underline underline-offset-4"
      >
        <GoogleMark size={14} />
        {c.signInBond}
      </a>
    );
  }
  if (saved) return <p className="mt-5 text-[14px] text-on-dark-muted">{c.savedBond}</p>;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void cloud
          .saveBond(other.name, other.birthDate)
          .then(onSaved)
          .catch(() => undefined)
          .finally(() => setBusy(false));
      }}
      className="mt-5 inline-flex h-11 items-center rounded-full border border-on-dark/30 px-5 text-[14px] font-medium transition-colors hover:border-on-dark/60 disabled:opacity-50"
    >
      {c.saveBond(other.name)}
    </button>
  );
}

/** Las dos piedras de signo giran una alrededor de la otra hasta unirse. */
function BondMixing({ a, b, label }: { a: SignCode; b: SignCode; label: string }) {
  const sa = signStone(a);
  const sb = signStone(b);
  return (
    <div className="sky-fade flex flex-col items-center py-6" aria-live="polite">
      <div className="relative size-[260px]">
        <span className="sky-bond-flash absolute inset-0 m-auto size-24 rounded-full border border-[var(--accent)]" />
        <span
          className="sky-bond-glow absolute inset-0 m-auto size-28 rounded-full blur-2xl"
          style={{ background: `radial-gradient(${sa.color}, ${sb.color})` }}
        />
        <div className="sky-bond-spin absolute inset-0">
          <span className="sky-bond-l absolute top-1/2 left-1/2 -mt-[40px] -ml-[40px]">
            <StoneImage src={sa.image} alt="" size={80} glow={sa.color} />
          </span>
          <span className="sky-bond-r absolute top-1/2 left-1/2 -mt-[40px] -ml-[40px]">
            <StoneImage src={sb.image} alt="" size={80} glow={sb.color} />
          </span>
        </div>
      </div>
      <p className="type-label mt-2 !text-on-dark">{label}</p>
    </div>
  );
}

function BondPerson({ code, name, label }: { code: SignCode; name: string; label?: string }) {
  const stone = signStone(code);
  return (
    <div className="flex w-[30%] flex-col items-center gap-1 text-center">
      <StoneImage src={stone.image} alt="" size={64} glow={stone.color} />
      <span className="max-w-full truncate text-[15px] font-medium">{name}</span>
      <span className="text-[12px] text-on-dark-muted">{label}</span>
    </div>
  );
}

/** Aro con el porcentaje de afinidad, que se llena y cuenta hacia arriba. */
function PercentRing({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1400);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const c = 2 * Math.PI * 44;
  return (
    <div className="relative size-[112px] shrink-0">
      <svg viewBox="-50 -50 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle r="44" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="4" />
        <circle
          r="44"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
        />
      </svg>
      <span className="font-display absolute inset-0 flex items-center justify-center text-[30px] font-semibold tabular-nums">
        {shown}%
      </span>
    </div>
  );
}

function Bonds({
  locale,
  chart,
  signBy,
}: {
  locale: LocaleCode;
  chart: NatalChart;
  signBy: Map<SignCode, SkySign>;
}) {
  const t = SKY_LABELS[locale];
  const ui = SKY_UI[locale];
  const [name, setName] = useState('');
  const [y, setY] = useState(1995);
  const [m, setM] = useState(1);
  const [d, setD] = useState(1);
  const [other, setOther] = useState<{
    name: string;
    /** Se escribió un nombre: solo así se puede guardar en Vínculos. */
    named: boolean;
    birthDate: string;
    chart: NatalChart;
  } | null>(null);
  const [mixing, setMixing] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const mine = { sun: sunOf(chart).sign, moon: moonOf(chart).sign };
  const cloud = useContext(CloudContext);
  const c = CLOUD_UI[locale];
  const [savedNow, setSavedNow] = useState(false);
  const formDate = isoDate(y, m, Math.min(d, daysIn(y, m)));
  const compare = (preset?: { name: string; birthDate: string }) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const who = preset?.name ?? name.trim();
    const date = preset?.birthDate ?? formDate;
    if (preset) {
      const [py, pm, pd] = preset.birthDate.split('-').map(Number) as [number, number, number];
      setName(preset.name);
      setY(py);
      setM(pm);
      setD(pd);
    }
    setSavedNow(false);
    setOther({
      name: who || (locale === 'es' ? 'Esa persona' : 'That person'),
      named: who.length > 0,
      birthDate: date,
      chart: chartOf({ date, time: null, place: null }),
    });
    setMixing(true);
    // Baja a la animación y, al terminar, deja a la vista el resultado.
    window.setTimeout(
      () => stage.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60,
    );
    window.setTimeout(() => setMixing(false), reduce ? 400 : 3000);
  };

  const rows = other
    ? COMPAT_ROWS.map((row) => {
        const theirs = { sun: sunOf(other.chart).sign, moon: moonOf(other.chart).sign };
        const pairs: Record<string, [SignCode, SignCode]> = {
          moods: [mine.moon, theirs.moon],
          talk: [mine.sun, theirs.sun],
          love: [mine.moon, theirs.sun],
          dreams: [mine.sun, theirs.moon],
        };
        const [a, b] = pairs[row.key]!;
        let score = elementHarmony(ELEMENT_OF[a], ELEMENT_OF[b]) as number;
        if (row.key === 'talk' && MODALITY_OF[a] !== MODALITY_OF[b]) score = Math.min(2, score + 1);
        return { ...row, a, b, score };
      })
    : [];
  const overall = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
  // Porcentaje de afinidad (52–96 %): cada fila suma según su armonía de elementos.
  const percent = rows.length
    ? Math.round(52 + (rows.reduce((s, r) => s + r.score, 0) / (rows.length * 2)) * 44)
    : 0;

  return (
    <>
      <h1 className="font-display text-[30px] leading-tight font-semibold">{t.compatTitle}</h1>
      <p className="text-[15px] text-on-dark-muted">{t.compatIntro}</p>
      {cloud.bonds.length > 0 && (
        <div>
          <p className="type-label mb-2 !text-on-dark-muted">{c.savedBonds}</p>
          <div className="sky-rail -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {cloud.bonds.map((bond) => (
              <span
                key={bond.id}
                className="flex shrink-0 items-center gap-1 rounded-full border border-on-dark/20 py-1 pr-1 pl-3 text-[14px]"
              >
                <button type="button" onClick={() => compare(bond)} className="py-1">
                  {bond.name}
                </button>
                <button
                  type="button"
                  aria-label={`${c.remove} ${bond.name}`}
                  onClick={() => cloud.deleteBond(bond.id)}
                  className="flex size-7 items-center justify-center rounded-full text-on-dark-muted hover:bg-on-dark/10"
                >
                  <svg {...iconProps} width={14} height={14}>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      <label className="flex flex-col gap-2">
        <span className="type-label !text-on-dark-muted">{t.compatName}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="h-12 border-b border-on-dark/30 bg-transparent font-display text-[22px] text-on-dark outline-none focus:border-[var(--accent)]"
        />
      </label>
      <div>
        <span className="type-label mb-1 block !text-on-dark-muted">{t.compatDate}</span>
        <div className="grid grid-cols-[0.8fr_1.6fr_1.1fr] gap-1">
          <WheelPicker
            label={ui.day}
            value={Math.min(d, daysIn(y, m))}
            onChange={setD}
            options={range(1, daysIn(y, m)).map((n) => [n, String(n)])}
          />
          <WheelPicker
            label={ui.month}
            value={m}
            onChange={setM}
            options={range(1, 12).map((n) => [
              n,
              new Date(2000, n - 1, 1).toLocaleDateString(locale, { month: 'long' }),
            ])}
          />
          <WheelPicker
            label={ui.year}
            value={y}
            onChange={setY}
            options={range(new Date().getFullYear(), 1920, -1).map((n) => [n, String(n)])}
          />
        </div>
      </div>
      <Button
        onPress={() => compare()}
        isDisabled={mixing}
        size="lg"
        className="h-12 bg-on-dark text-[15px] text-text"
      >
        {t.compatCta}
      </Button>
      <div ref={stage} className="scroll-mt-4">
        {other && mixing && (
          <BondMixing
            a={mine.sun}
            b={sunOf(other.chart).sign}
            label={locale === 'es' ? 'Uniendo sus cielos…' : 'Joining your skies…'}
          />
        )}
        {other && !mixing && (
          <Panel className="sky-in">
            <div className="flex items-center justify-center gap-3">
              <BondPerson
                code={mine.sun}
                name={locale === 'es' ? 'Tú' : 'You'}
                label={signBy.get(mine.sun)?.label}
              />
              <PercentRing value={percent} />
              <BondPerson
                code={sunOf(other.chart).sign}
                name={other.name}
                label={signBy.get(sunOf(other.chart).sign)?.label}
              />
            </div>
            <p className="font-display mt-6 text-center text-[20px] leading-snug">
              {COMPAT_TEXT[locale][overall as 0 | 1 | 2]}
            </p>
            <div className="mt-6 flex flex-col gap-4 border-t border-on-dark/10 pt-5">
              {rows.map((row, i) => (
                <div key={row.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="type-label !text-on-dark">{row.label[locale]}</p>
                    <p className="text-[12px] text-on-dark-muted">
                      {signBy.get(row.a)?.label} · {signBy.get(row.b)?.label}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-on-dark/10">
                    <span
                      className="sky-bar block h-full rounded-full bg-[var(--accent)]"
                      style={{
                        ['--w' as string]: `${34 + row.score * 31}%`,
                        animationDelay: `${0.35 + i * 0.18}s`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {other.named && (
              <BondSave
                other={other}
                saved={
                  savedNow ||
                  cloud.bonds.some((b) => b.name === other.name && b.birthDate === other.birthDate)
                }
                onSaved={() => setSavedNow(true)}
                locale={locale}
              />
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ hojas */

function GlossarySheet({
  locale,
  which,
  onClose,
  onPick,
}: {
  locale: LocaleCode;
  which: GlossaryKey | 'all' | null;
  onClose: () => void;
  onPick: (key: GlossaryKey | 'all') => void;
}) {
  const ui = SKY_UI[locale];
  const entries = which === 'all' ? GLOSSARY : GLOSSARY.filter((g) => g.key === which);
  const title =
    which === 'all' || which === null ? ui.guide : (entries[0]?.title[locale] ?? ui.guide);
  return (
    <Sheet open={which !== null} title={title} onClose={onClose} closeLabel={ui.close}>
      <div className="flex flex-col gap-6">
        {entries.map((entry) => (
          <div key={entry.key}>
            {which === 'all' && (
              <p className="type-label mb-2 !text-[var(--accent)]">{entry.title[locale]}</p>
            )}
            <p className="text-[16px] leading-relaxed text-on-dark/90">{entry.body[locale]}</p>
          </div>
        ))}
        {which !== 'all' && (
          <button
            type="button"
            onClick={() => onPick('all')}
            className="self-start text-[14px] text-on-dark-muted underline underline-offset-4"
          >
            {ui.guide} →
          </button>
        )}
      </div>
    </Sheet>
  );
}

function SettingsSheet({
  locale,
  open,
  profile,
  onClose,
  onEdit,
  onReplayIntro,
  onForget,
  accountHref,
}: {
  locale: LocaleCode;
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onEdit: (target: 'date' | 'time' | 'place') => void;
  onReplayIntro: () => void;
  onForget: () => void;
  accountHref: string;
}) {
  const ui = SKY_UI[locale];
  const cloud = useContext(CloudContext);
  const c = CLOUD_UI[locale];
  const rows: [string, string, 'date' | 'time' | 'place' | null][] = [
    [ui.settingsDate, new Date(`${profile.date}T12:00`).toLocaleDateString(locale), 'date'],
    [ui.settingsTime, profile.time ?? ui.unknown, 'time'],
    [
      ui.settingsPlace,
      profile.place ? `${profile.place.name}, ${profile.place.country}` : ui.unknown,
      'place',
    ],
    [ui.houseSystem, ui.porphyry, null],
  ];
  return (
    <Sheet open={open} title={ui.settings} onClose={onClose} closeLabel={ui.done}>
      <div className="-mx-6 flex flex-col divide-y divide-on-dark/10 border-y border-on-dark/10">
        {rows.map(([label, value, target]) => (
          <button
            key={label}
            type="button"
            disabled={!target}
            onClick={() => target && onEdit(target)}
            className="flex items-center justify-between px-6 py-4 text-left text-[15px] disabled:cursor-default"
          >
            <span>{label}</span>
            <span className="flex items-center gap-2 text-on-dark-muted">
              {value}
              {target && <span aria-hidden="true">→</span>}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-md border border-on-dark/15 p-4">
        <p className="type-label !text-on-dark-muted">{c.account}</p>
        {cloud.account ? (
          <>
            <p className="mt-2 text-[14px] text-on-dark/80">
              {c.signedAs}{' '}
              <a href={accountHref} className="text-on-dark underline underline-offset-4">
                {cloud.account.email}
              </a>
            </p>
            <p className="mt-1 text-[13px] text-on-dark-muted">{c.syncNote}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-3 text-[14px] underline underline-offset-4"
            >
              {c.signOut}
            </button>
          </>
        ) : cloud.googleEnabled ? (
          <a
            href={googleLoginUrl()}
            className="mt-3 inline-flex h-11 items-center gap-3 rounded-full bg-white px-5 text-[14px] font-medium text-black"
          >
            <GoogleMark />
            {c.google}
          </a>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col items-start gap-4">
        <button
          type="button"
          onClick={onReplayIntro}
          className="text-[15px] underline underline-offset-4"
        >
          {ui.replayIntro}
        </button>
        <button
          type="button"
          onClick={onForget}
          className="text-[15px] text-on-dark-muted underline underline-offset-4"
        >
          {SKY_LABELS[locale].forget}
        </button>
      </div>
    </Sheet>
  );
}
