import { type LocaleCode, type SkyDayDto, type MarkSkyDayRequest } from '@antrina/contracts';
import { ArrowRightIcon } from '@antrina/ui';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DAILY_UI,
  dailyAlly,
  type DailyArea,
  dayProfile,
  type DayProfile,
  FORTUNE_LEVEL_LABEL,
  FORTUNE_VERSES,
  fortuneFor,
  limaDay,
  LUCKY_COLORS,
  LUCKY_ITEMS,
  type NatalChart,
  PERSONAL_BRIDGE,
  RANK_NOTE,
  RANK_PHRASES,
  type RankedSign,
  rankingFor,
  SIGN_SKY,
  type SignCode,
  STONE_LIBRARY,
  STREAK_GOAL,
  streakOf,
} from '@antrina/sky';
import { skyApi } from '../../lib/customer-client';
import { Panel, Sheet, StoneImage } from './parts';

/**
 * El ritual diario de "Tu cielo": checklist con racha, ranking de los 12 signos (cuenta regresiva
 * del 12 al 1, como en la TV japonesa), galleta de cuarzo con papel de la fortuna (omikuji con
 * cristal), ritual de luz, índices por área con aliado y colección de piedras. Sin sesión se guarda
 * en el dispositivo; con sesión, también en la cuenta.
 */

const DAYS_KEY = 'antrina-sky-days';
type DayMap = Record<string, SkyDayDto>;

function readDays(): DayMap {
  try {
    const raw = window.localStorage.getItem(DAYS_KEY);
    return raw ? (JSON.parse(raw) as DayMap) : {};
  } catch {
    return {};
  }
}
function writeDays(days: DayMap): void {
  try {
    window.localStorage.setItem(DAYS_KEY, JSON.stringify(days));
  } catch {
    /* sin almacenamiento */
  }
}

const empty = (day: string): SkyDayDto => ({
  day,
  rankingSeen: false,
  ritualDone: false,
  fortune: null,
});
const merge = (a: SkyDayDto, b: Partial<SkyDayDto>): SkyDayDto => ({
  day: a.day,
  rankingSeen: a.rankingSeen || !!b.rankingSeen,
  ritualDone: a.ritualDone || !!b.ritualDone,
  fortune: a.fortune ?? b.fortune ?? null,
});

/* ------------------------------------------------------------------ estado del día */

interface DailyState {
  locale: LocaleCode;
  today: string;
  ranking: RankedSign[];
  mine: RankedSign;
  /** Lectura única del día (de aquí salen todos los textos). */
  profile: DayProfile;
  sun: SignCode;
  signLabel: (code: SignCode) => string;
  record: SkyDayDto;
  days: DayMap;
  streak: number;
  bestStreak: number;
  mark: (patch: MarkSkyDayRequest) => void;
  openRanking: () => void;
  openRitual: () => void;
  seed: string;
}

const DailyContext = createContext<DailyState | null>(null);
const useDaily = () => useContext(DailyContext)!;

function bestStreakOf(days: string[]): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    const expected = prev
      ? new Date(Date.parse(`${prev}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
      : null;
    run = expected === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function DailyProvider({
  locale,
  chart,
  seed,
  signLabels,
  signedIn,
  serverDays,
  children,
}: {
  locale: LocaleCode;
  chart: NatalChart;
  /** Fecha de nacimiento: el papel del día es el mismo en cualquier dispositivo. */
  seed: string;
  signLabels: Map<SignCode, string>;
  signedIn: boolean;
  serverDays: SkyDayDto[];
  children: ReactNode;
}) {
  const today = useMemo(() => limaDay(), []);
  const ranking = useMemo(() => rankingFor(today), [today]);
  const sun = chart.placements.find((p) => p.point === 'sun')!.sign;
  const mine = ranking.find((r) => r.sign === sun)!;
  const profile = useMemo(() => dayProfile(chart, today, ranking), [chart, today, ranking]);
  const [days, setDays] = useState<DayMap>({});
  const [rankingOpen, setRankingOpen] = useState(false);
  const [ritualOpen, setRitualOpen] = useState(false);

  // Local + cuenta: se unen (nada marcado se pierde) y lo local que falte se sube.
  useEffect(() => {
    const local = readDays();
    const merged: DayMap = { ...local };
    for (const day of serverDays) merged[day.day] = merge(merged[day.day] ?? empty(day.day), day);
    merged[today] = merged[today] ?? empty(today);
    writeDays(merged);
    setDays(merged);
    if (signedIn) {
      const remote = new Set(serverDays.map((d) => d.day));
      for (const record of Object.values(merged)) {
        const recent = Date.parse(`${record.day}T12:00:00Z`) > Date.now() - 2 * 86_400_000;
        if (!remote.has(record.day) && recent) {
          void skyApi
            .markDay(record.day, {
              rankingSeen: record.rankingSeen,
              ritualDone: record.ritualDone,
              ...(record.fortune ? { fortune: record.fortune } : {}),
            })
            .catch(() => undefined);
        }
      }
    }
  }, [serverDays, signedIn, today]);

  const mark = useCallback(
    (patch: MarkSkyDayRequest) => {
      setDays((current) => {
        const next = { ...current, [today]: merge(current[today] ?? empty(today), patch) };
        writeDays(next);
        return next;
      });
      if (signedIn) void skyApi.markDay(today, patch).catch(() => undefined);
    },
    [signedIn, today],
  );

  const dayKeys = Object.keys(days);
  const value: DailyState = {
    locale,
    today,
    ranking,
    mine,
    profile,
    sun,
    signLabel: (code) => signLabels.get(code) ?? code,
    record: days[today] ?? empty(today),
    days,
    streak: streakOf(dayKeys, today),
    bestStreak: bestStreakOf(dayKeys),
    mark,
    openRanking: () => {
      setRankingOpen(true);
      mark({ rankingSeen: true });
    },
    openRitual: () => setRitualOpen(true),
    seed,
  };

  return (
    <DailyContext.Provider value={value}>
      {children}
      <RankingSheet open={rankingOpen} onClose={() => setRankingOpen(false)} />
      <RitualSheet open={ritualOpen} onClose={() => setRitualOpen(false)} />
    </DailyContext.Provider>
  );
}

/* ------------------------------------------------------------------ piezas */

function CheckCircle({ done }: { done: boolean }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
        done
          ? 'sky-check border-transparent bg-[#34d399] text-black'
          : 'border-white/25 text-transparent'
      }`}
      aria-hidden="true"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" className={done ? 'sky-check-path' : ''} />
      </svg>
    </span>
  );
}

const ordinal = (n: number, locale: LocaleCode) => (locale === 'es' ? `${n}.°` : `#${n}`);

/** Checklist del día con racha (verde al completar; se puede volver a entrar). */
export function DailyChecklist() {
  const d = useDaily();
  const t = DAILY_UI[d.locale];
  const steps: { key: string; label: string; done: boolean; open: () => void }[] = [
    { key: 'ranking', label: t.steps.ranking, done: d.record.rankingSeen, open: d.openRanking },
    {
      key: 'fortune',
      label: t.steps.fortune,
      done: d.record.fortune !== null,
      open: () =>
        document
          .getElementById('sky-fortune')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    },
    { key: 'ritual', label: t.steps.ritual, done: d.record.ritualDone, open: d.openRitual },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const left = Math.max(
    0,
    STREAK_GOAL -
      (d.streak % STREAK_GOAL === 0 && d.streak > 0 ? STREAK_GOAL : d.streak % STREAK_GOAL),
  );
  return (
    <section className="sky-glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="type-label whitespace-nowrap !text-white/60">{t.ritualTitle}</p>
          <p className="mt-1 text-[15px] font-medium">{t.streak(d.streak)}</p>
        </div>
        <div className="flex items-center gap-1" aria-label={`${doneCount}/3`}>
          {Array.from({ length: STREAK_GOAL }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-3 rounded-full transition-colors ${
                i < (d.streak % STREAK_GOAL || (d.streak > 0 ? STREAK_GOAL : 0))
                  ? 'bg-[#34d399]'
                  : 'bg-white/12'
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-1 text-[12px] text-white/50">
        {t.streakGoal(d.bestStreak >= STREAK_GOAL ? 0 : left)}
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-white/8">
        {steps.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              onClick={step.open}
              className="flex w-full items-center gap-3 py-3 text-left transition-opacity hover:opacity-90"
            >
              <CheckCircle done={step.done} />
              <span className={`flex-1 text-[15px] ${step.done ? 'text-white/70' : ''}`}>
                {step.label}
              </span>
              <span className="flex items-center gap-1 text-[12px] text-white/55">
                {step.done ? t.again : t.open}
                <ArrowRightIcon />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tu puesto de hoy, con color, número, hora, objeto y piedra de la suerte. */
export function RankingCard() {
  const d = useDaily();
  const t = DAILY_UI[d.locale];
  const r = d.mine;
  const color = LUCKY_COLORS[r.colorIndex]!;
  const stone = STONE_LIBRARY[r.stoneId]!;
  const note =
    r.position === 1
      ? RANK_NOTE.first
      : r.position <= 3
        ? RANK_NOTE.podium
        : r.position >= 10
          ? RANK_NOTE.rescue
          : null;
  return (
    <Panel className="relative overflow-hidden">
      <p className="type-label !text-[var(--accent)]">{t.rankingTitle}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-[64px] leading-none font-semibold tabular-nums">
            {ordinal(r.position, d.locale)}
          </p>
          <p className="mt-1 text-[15px] text-white/75">
            {t.rankingToday(d.signLabel(r.sign), r.position)}
          </p>
        </div>
        <StoneImage src={stone.image} alt="" size={84} glow={stone.color} />
      </div>
      <p className="mt-4 text-[16px] leading-relaxed">
        {RANK_PHRASES[r.tier][d.locale][r.phraseIndex]}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
        <div>
          <dt className="text-white/50">{t.luckyColor}</dt>
          <dd className="mt-0.5 flex items-center gap-2">
            <span
              className="size-3 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: color.hex }}
            />
            {color.name[d.locale]}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">
            {t.luckyNumber} · {t.luckyHour}
          </dt>
          <dd className="mt-0.5 tabular-nums">
            {r.number} · {String(r.hour).padStart(2, '0')}:00–{String(r.hour + 1).padStart(2, '0')}
            :00
          </dd>
        </div>
        <div>
          <dt className="text-white/50">{t.luckyItem}</dt>
          <dd className="mt-0.5">{LUCKY_ITEMS[d.locale][r.itemIndex]}</dd>
        </div>
        <div>
          <dt className="text-white/50">{t.stoneOfDay}</dt>
          <dd className="mt-0.5">{stone.name[d.locale]}</dd>
        </div>
      </dl>
      <PersonalBridge />
      {note && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] leading-relaxed text-white/85">
          {note[d.locale]}
          {r.position >= 10 && (
            <button
              type="button"
              onClick={d.openRitual}
              className="mt-2 block text-[14px] font-medium text-[var(--accent)] underline underline-offset-4"
            >
              {DAILY_UI[d.locale].ritualOpen(stone.name[d.locale])}
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={d.openRanking}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-[14px] font-medium text-black transition-transform active:scale-[0.98]"
      >
        {t.seeRanking}
        <ArrowRightIcon />
      </button>
    </Panel>
  );
}

/** Une el puesto global de tu signo con tu carta: así nada se contradice. */
function PersonalBridge() {
  const d = useDaily();
  const b = PERSONAL_BRIDGE[d.locale];
  const { rank, indices, best, worst } = d.profile;
  const text =
    rank.tier === 'low' && indices[best] >= 64
      ? b.lowButBright(b.areas[best])
      : rank.tier === 'high' && indices[worst] < 42
        ? b.highButCalm(b.areas[worst])
        : b.aligned(b.areas[best]);
  return (
    <p className="mt-3 text-[14px] leading-relaxed text-white/75">
      <span className="mr-2 text-[11px] font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
        {b.label}
      </span>
      {text}
    </p>
  );
}

/** Ranking completo con cuenta regresiva del 12 al 1. */
function RankingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDaily();
  const t = DAILY_UI[d.locale];
  const [sharing, setSharing] = useState(false);
  const rows = [...d.ranking].reverse(); // 12 → 1
  return (
    <Sheet
      open={open}
      title={t.rankingTitle}
      onClose={onClose}
      closeLabel={d.locale === 'es' ? 'Cerrar' : 'Close'}
    >
      <p className="sky-fade -mt-2 mb-4 text-[13px] text-white/55">
        {new Date(`${d.today}T12:00:00`).toLocaleDateString(d.locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </p>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const mine = r.sign === d.sun;
          const color = LUCKY_COLORS[r.colorIndex]!;
          return (
            <li
              key={r.sign}
              className={`sky-rank-row flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                mine ? 'border-[var(--accent)] bg-white/[0.07]' : 'border-white/8 bg-white/[0.02]'
              } ${r.position === 1 ? 'sky-rank-first' : ''}`}
              style={{ animationDelay: `${0.25 + i * 0.16}s` }}
            >
              <span className="font-display w-11 shrink-0 text-center text-[24px] leading-none font-semibold tabular-nums">
                {ordinal(r.position, d.locale)}
              </span>
              <span className="sky-symbol w-6 shrink-0 text-center text-[18px] text-white/80">
                {SIGN_SKY[r.sign].glyph}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-medium">
                  {d.signLabel(r.sign)}
                  {mine && (
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-black uppercase">
                      {t.yours}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-white/60">
                  {RANK_PHRASES[r.tier][d.locale][r.phraseIndex]}
                </span>
              </span>
              <span
                className="size-3 shrink-0 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: color.hex }}
                title={color.name[d.locale]}
              />
            </li>
          );
        })}
      </ol>
      <div className="mt-5 flex flex-col gap-3 pb-2">
        <button
          type="button"
          disabled={sharing}
          onClick={() => {
            setSharing(true);
            void shareRanking(d).finally(() => setSharing(false));
          }}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-medium text-black disabled:opacity-60"
        >
          {t.share}
        </button>
        <a
          href={d.locale === 'es' ? '/ranking-de-hoy' : '/en/todays-ranking'}
          target="_blank"
          rel="noopener"
          className="text-center text-[13px] text-white/60 underline underline-offset-4"
        >
          {t.publicLink}
        </a>
        <p className="text-[11px] leading-relaxed text-white/40">{t.disclaimer}</p>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ galleta de cuarzo */

/** El cuarzo se rompe y sale el papel de la fortuna del día (una vez al día; se puede releer). */
export function FortuneCookie() {
  const d = useDaily();
  const t = DAILY_UI[d.locale];
  const fortune = useMemo(
    () => d.record.fortune ?? fortuneFor(d.today, d.seed, d.profile),
    [d.record.fortune, d.today, d.seed, d.profile],
  );
  const opened = d.record.fortune !== null;
  const [phase, setPhase] = useState<'closed' | 'cracking' | 'open'>(opened ? 'open' : 'closed');
  useEffect(() => {
    if (opened && phase === 'closed') setPhase('open');
  }, [opened, phase]);
  const stone = STONE_LIBRARY[fortune.stoneId] ?? STONE_LIBRARY['cuarzo-cristal']!;
  const crack = () => {
    if (phase !== 'closed') return;
    setPhase('cracking');
    window.setTimeout(() => {
      setPhase('open');
      d.mark({ fortune });
    }, 1300);
  };
  return (
    <section
      id="sky-fortune"
      className="sky-glass scroll-mt-24 overflow-hidden rounded-2xl px-5 pt-5 pb-6"
    >
      <p className="type-label !text-white/60">
        {phase === 'open' ? t.fortuneAgain : t.fortuneTitle}
      </p>
      {phase !== 'open' ? (
        <button
          type="button"
          onClick={crack}
          aria-label={t.fortuneHint}
          className={`relative mx-auto mt-4 flex h-[220px] w-[220px] items-center justify-center ${phase === 'cracking' ? 'sky-crack' : 'sky-crystal-idle'}`}
        >
          <span className="sky-crystal-glow absolute inset-6 rounded-full" aria-hidden="true" />
          <span className="sky-half sky-half-l absolute inset-0 flex items-center justify-center">
            <img
              src="/world/sky/stones/cuarzo-cristal.webp"
              alt=""
              className="sky-stone max-h-[200px]"
            />
          </span>
          <span className="sky-half sky-half-r absolute inset-0 flex items-center justify-center">
            <img
              src="/world/sky/stones/cuarzo-cristal.webp"
              alt=""
              className="sky-stone max-h-[200px]"
            />
          </span>
          {phase === 'cracking' && (
            <span className="sky-flash absolute inset-0 rounded-full" aria-hidden="true" />
          )}
        </button>
      ) : (
        <div className="sky-paper mx-auto mt-4 max-w-sm rounded-md bg-[#f6f0e4] px-6 py-6 text-center text-[#1b2a41] shadow-[0_20px_50px_rgba(0,0,0,.45)]">
          <img
            src="/brand/antrina-logo.png"
            alt="Antrina"
            width={960}
            height={288}
            className="mx-auto h-7 w-auto"
          />
          <p className="mt-2 text-[10px] tracking-[0.3em] text-[#9a4f2f] uppercase">{d.today}</p>
          <p className="font-display mt-2 text-[30px] leading-tight font-semibold">
            {FORTUNE_LEVEL_LABEL[fortune.level][d.locale]}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed">
            {FORTUNE_VERSES[fortune.level][d.locale][fortune.verseIndex]}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 border-t border-[#1b2a41]/10 pt-4">
            <StoneImage src={stone.image} alt="" size={48} />
            <span className="text-left text-[13px]">
              <span className="block text-[#1b2a41]/60">{t.fortuneStone}</span>
              <span className="font-medium">{stone.name[d.locale]}</span>
            </span>
          </div>
        </div>
      )}
      {phase === 'open' && (
        <p className="mt-3 text-center text-[12px] text-white/45">{t.fortuneNote}</p>
      )}
      {phase === 'closed' && (
        <p className="mt-2 text-center text-[13px] text-white/55">{t.fortuneHint}</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ ritual de luz */

function RitualSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDaily();
  const t = DAILY_UI[d.locale];
  const stone = STONE_LIBRARY[d.mine.stoneId]!;
  const [step, setStep] = useState(0);
  const [breath, setBreath] = useState(0);
  const [intention, setIntention] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setBreath(0);
      return;
    }
  }, [open]);

  // Respiración: 3 ciclos de 4 s inhalar / 4 s exhalar.
  useEffect(() => {
    if (step !== 1) return;
    setBreath(0);
    let count = 0;
    timer.current = window.setInterval(() => {
      count += 1;
      setBreath(count);
      if (count >= 6 && timer.current) window.clearInterval(timer.current);
    }, 4000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [step]);

  const finish = () => {
    d.mark({ ritualDone: true });
    try {
      if (intention.trim())
        window.localStorage.setItem(`antrina-sky-intention-${d.today}`, intention.trim());
    } catch {
      /* nada */
    }
    setStep(3);
  };

  return (
    <Sheet
      open={open}
      title={t.ritualOpen(stone.name[d.locale])}
      onClose={onClose}
      closeLabel={d.locale === 'es' ? 'Cerrar' : 'Close'}
    >
      <div className="flex flex-col items-center pb-4 text-center">
        <div className="mb-5 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 w-10 rounded-full ${i <= Math.min(step, 2) ? 'bg-[var(--accent)]' : 'bg-white/15'}`}
            />
          ))}
        </div>
        {step === 0 && (
          <>
            <StoneImage
              src={stone.image}
              alt={stone.name[d.locale]}
              size={180}
              glow={stone.color}
            />
            <p className="mt-4 text-[17px] leading-relaxed">{t.ritualSteps[0]}</p>
          </>
        )}
        {step === 1 && (
          <>
            <div className="relative flex size-56 items-center justify-center">
              <span
                className="absolute inset-0 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 transition-transform duration-[4000ms] ease-in-out"
                style={{ transform: `scale(${breath % 2 === 0 ? 1 : 0.62})` }}
              />
              <span className="relative text-[18px] font-medium">
                {breath % 2 === 0 ? t.breatheIn : t.breatheOut}
              </span>
            </div>
            <p className="mt-4 text-[15px] text-white/70">{t.ritualSteps[1]}</p>
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-[17px] leading-relaxed">{t.ritualSteps[2]}</p>
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              maxLength={140}
              rows={3}
              placeholder={t.intentionPlaceholder}
              className="mt-4 w-full rounded-xl border border-white/15 bg-white/[0.04] p-4 text-[16px] text-white outline-none placeholder:text-white/35 focus:border-[var(--accent)]"
            />
          </>
        )}
        {step === 3 && (
          <>
            <span className="sky-check flex size-20 items-center justify-center rounded-full bg-[#34d399] text-black">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" className="sky-check-path" />
              </svg>
            </span>
            <p className="mt-4 text-[17px]">{t.ritualDone}</p>
          </>
        )}
        <button
          type="button"
          onClick={() => (step === 2 ? finish() : step === 3 ? onClose() : setStep(step + 1))}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-medium text-black"
        >
          {step === 2 ? t.finish : step === 3 ? (d.locale === 'es' ? 'Cerrar' : 'Close') : t.next}
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ índices y aliado */

export function IndicesCard({ onCompare }: { onCompare: () => void }) {
  const d = useDaily();
  const t = DAILY_UI[d.locale];
  const indices = d.profile.indices;
  const ally = useMemo(() => dailyAlly(d.sun, d.ranking), [d.sun, d.ranking]);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 150);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <Panel>
      <p className="type-label !text-[var(--accent)]">{t.indicesTitle}</p>
      <div className="mt-4 flex flex-col gap-3">
        {(Object.keys(indices) as DailyArea[]).map((area) => (
          <div key={area}>
            <div className="flex justify-between text-[13px]">
              <span>{t.areas[area]}</span>
              <span className="tabular-nums text-white/70">{indices[area]}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000 ease-out"
                style={{ width: shown ? `${indices[area]}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <span className="sky-symbol flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-[20px]">
          {SIGN_SKY[ally].glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-white/55">{t.ally}</p>
          <p className="text-[14px] leading-snug">{t.allyText(d.signLabel(ally))}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCompare}
        className="mt-3 text-[14px] font-medium text-[var(--accent)] underline underline-offset-4"
      >
        {t.compare}
      </button>
    </Panel>
  );
}

/* ------------------------------------------------------------------ colección */

export function CollectionCard() {
  const d = useDaily();
  const t = DAILY_UI[d.locale];
  const counts = new Map<string, number>();
  for (const record of Object.values(d.days)) {
    if (record.fortune)
      counts.set(record.fortune.stoneId, (counts.get(record.fortune.stoneId) ?? 0) + 1);
  }
  const ids = Object.keys(STONE_LIBRARY);
  const found = ids.filter((id) => counts.has(id)).length;
  const master = d.bestStreak >= STREAK_GOAL;
  return (
    <Panel>
      <p className="type-label !text-[var(--accent)]">{t.collection}</p>
      <p className="mt-1 text-[13px] text-white/55">{t.collectionHint(found, ids.length)}</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div
          className={`col-span-4 flex items-center gap-3 rounded-xl border px-3 py-2 ${
            master ? 'border-[#34d399]/50 bg-[#34d399]/[0.06]' : 'border-white/8'
          }`}
        >
          <span className={master ? '' : 'opacity-25 grayscale'}>
            <StoneImage
              src={STONE_LIBRARY['cuarzo-cristal']!.image}
              alt=""
              size={44}
              glow={master ? '#bfe9ff' : undefined}
            />
          </span>
          <span className="text-left">
            <span className="block text-[14px] font-medium">{t.master}</span>
            <span className="text-[12px] text-white/55">
              {master ? t.streakGoal(0) : t.masterHint}
            </span>
          </span>
        </div>
        {ids.map((id) => {
          const stone = STONE_LIBRARY[id]!;
          const n = counts.get(id) ?? 0;
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/8 px-1 py-2 text-center"
            >
              <span className={n > 0 ? '' : 'opacity-20 grayscale'}>
                <StoneImage
                  src={stone.image}
                  alt=""
                  size={40}
                  glow={n > 0 ? stone.color : undefined}
                />
              </span>
              <span
                className={`text-[10px] leading-tight ${n > 0 ? 'text-white/85' : 'text-white/35'}`}
              >
                {n > 0 ? stone.name[d.locale] : '?'}
              </span>
              {n > 1 && <span className="text-[9px] text-white/45">{t.times(n)}</span>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ compartir */

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  line: number,
) {
  const words = text.split(' ');
  let current = '';
  let row = 0;
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > max && current) {
      ctx.fillText(current, x, y + row * line);
      current = word;
      row += 1;
    } else current = test;
  }
  ctx.fillText(current, x, y + row * line);
}

/** Tarjeta 1080×1350 (formato de Instagram) con tu puesto y el podio del día. */
async function shareRanking(d: DailyState): Promise<void> {
  const t = DAILY_UI[d.locale];
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  await document.fonts.ready;
  const bg = ctx.createRadialGradient(W * 0.7, H * 0.2, 50, W * 0.5, H * 0.5, H);
  bg.addColorStop(0, '#16213a');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * W;
    const y = (Math.cos(i * 47.3) * 0.5 + 0.5) * H;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const r = d.mine;
  const stone = STONE_LIBRARY[r.stoneId]!;
  const color = LUCKY_COLORS[r.colorIndex]!;
  const logo = await loadImage('/brand/antrina-logo-negativo.png');
  if (logo) ctx.drawImage(logo, 82, 60, 300, (logo.height / logo.width) * 300);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '500 30px "DM Sans", sans-serif';
  ctx.fillText(t.rankingTitle.toUpperCase(), 90, 205);
  ctx.font = '400 30px "DM Sans", sans-serif';
  ctx.fillText(
    new Date(`${d.today}T12:00:00`).toLocaleDateString(d.locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    90,
    250,
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 260px "Fraunces", serif';
  ctx.fillText(ordinal(r.position, d.locale), 80, 470);
  ctx.font = '600 72px "Fraunces", serif';
  ctx.fillText(d.signLabel(r.sign), 90, 570);
  const img = await loadImage(stone.image);
  if (img) {
    const size = 300;
    ctx.drawImage(img, W - size - 80, 250, size, (img.height / img.width) * size);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '400 38px "DM Sans", sans-serif';
  wrap(ctx, RANK_PHRASES[r.tier][d.locale][r.phraseIndex]!, 90, 660, W - 180, 54);
  const facts: [string, string][] = [
    [t.luckyColor, color.name[d.locale]],
    [t.luckyNumber, String(r.number)],
    [t.luckyItem, LUCKY_ITEMS[d.locale][r.itemIndex]!],
    [t.stoneOfDay, stone.name[d.locale]],
  ];
  facts.forEach(([label, value], i) => {
    const x = 90 + (i % 2) * 460;
    const y = 870 + Math.floor(i / 2) * 120;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 26px "DM Sans", sans-serif';
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 38px "DM Sans", sans-serif';
    ctx.fillText(value, x, y + 50);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '400 28px "DM Sans", sans-serif';
  const podium = d.ranking
    .slice(0, 3)
    .map((p) => `${ordinal(p.position, d.locale)} ${d.signLabel(p.sign)}`)
    .join('   ');
  ctx.fillText(podium, 90, 1160);
  ctx.fillStyle = '#ffffff';
  ctx.font = '500 32px "DM Sans", sans-serif';
  ctx.fillText(
    `antrina.app${d.locale === 'es' ? '/ranking-de-hoy' : '/en/todays-ranking'}`,
    90,
    1250,
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `antrina-ranking-${d.today}.png`, { type: 'image/png' });
  const text = `${t.rankingToday(d.signLabel(r.sign), r.position)} · antrina.app${d.locale === 'es' ? '/ranking-de-hoy' : '/en/todays-ranking'}`;
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
