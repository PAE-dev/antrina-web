import { useEffect, useState } from 'react';
import { SIGN_CODES } from '../../sky/astrology';
import { SIGN_SKY } from '../../sky/content';
import { type Planet } from '../../sky/ephemeris';

/**
 * Planetario: la Tierra al centro, la rueda del zodiaco alrededor y cada planeta (con su foto) en
 * su longitud real. Modos: `settle` (los planetas giran y se acomodan en su lugar, como si se
 * calculara la carta), `spin` (giran despacio, para esperar) y `static`.
 */

const ORDER: Planet[] = [
  'moon',
  'mercury',
  'venus',
  'sun',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];
const SIZE: Record<Planet, number> = {
  moon: 0.075,
  mercury: 0.05,
  venus: 0.065,
  sun: 0.12,
  mars: 0.06,
  jupiter: 0.1,
  saturn: 0.14,
  uranus: 0.085,
  neptune: 0.075,
  pluto: 0.035,
};

export interface OrreryPoint {
  planet: Planet;
  longitude: number;
}

export function Orrery({
  points,
  ascendant = null,
  mode = 'static',
  size = 320,
  className = '',
}: {
  points: OrreryPoint[];
  ascendant?: number | null;
  mode?: 'settle' | 'spin' | 'static';
  size?: number;
  className?: string;
}) {
  // El ascendente (si hay) queda a la izquierda, como en las cartas tradicionales.
  const offset = ascendant ?? 0;
  const angleOf = (lon: number) => 180 + (lon - offset); // grados, antihorario desde la derecha
  const [settled, setSettled] = useState(mode !== 'settle');
  useEffect(() => {
    if (mode !== 'settle') return;
    const t = window.setTimeout(() => setSettled(true), 60);
    return () => window.clearTimeout(t);
  }, [mode]);

  const R = size / 2;
  const ringIn = R * 0.83;
  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox={`${-R} ${-R} ${size} ${size}`} className="absolute inset-0 h-full w-full">
        <circle r={R - 1} fill="none" stroke="#f3ecdf" strokeOpacity="0.22" />
        <circle r={ringIn} fill="none" stroke="#f3ecdf" strokeOpacity="0.16" />
        {ORDER.slice(0, 9).map((p, i) => (
          <circle
            key={p}
            r={R * (0.3 + i * 0.065)}
            fill="none"
            stroke="#f3ecdf"
            strokeOpacity="0.05"
          />
        ))}
        {SIGN_CODES.map((code, i) => {
          const a = (-angleOf(i * 30) * Math.PI) / 180;
          const mid = (-angleOf(i * 30 + 15) * Math.PI) / 180;
          return (
            <g key={code}>
              <line
                x1={Math.cos(a) * ringIn}
                y1={Math.sin(a) * ringIn}
                x2={Math.cos(a) * (R - 1)}
                y2={Math.sin(a) * (R - 1)}
                stroke="#f3ecdf"
                strokeOpacity="0.2"
              />
              <text
                x={Math.cos(mid) * (R * 0.915)}
                y={Math.sin(mid) * (R * 0.915)}
                fill="#f3ecdf"
                fillOpacity="0.7"
                fontSize={R * 0.085}
                textAnchor="middle"
                dominantBaseline="central"
                className="sky-symbol"
              >
                {SIGN_SKY[code].glyph}
              </text>
            </g>
          );
        })}
        {ascendant !== null && (
          <line
            x1={-ringIn}
            y1="0"
            x2={-R * 0.22}
            y2="0"
            stroke="#f3ecdf"
            strokeOpacity="0.35"
            strokeDasharray="3 4"
          />
        )}
      </svg>
      <img
        src="/world/sky/planets/earth.webp"
        alt=""
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: size * 0.15 }}
      />
      {points.map((point, i) => {
        const index = ORDER.indexOf(point.planet);
        const radius = R * (0.3 + index * 0.058);
        const final = angleOf(point.longitude);
        const start = final + 360 * (1 + (i % 3)) + i * 37;
        const angle = settled ? final : start;
        const px = size * SIZE[point.planet];
        return (
          <div
            key={point.planet}
            className={mode === 'spin' ? 'sky-orbit-spin absolute inset-0' : 'absolute inset-0'}
            style={{ animationDuration: mode === 'spin' ? `${14 + index * 5}s` : undefined }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `rotate(${-angle}deg)`,
                transition:
                  mode === 'settle'
                    ? `transform ${2.2 + index * 0.18}s cubic-bezier(.16,.84,.24,1)`
                    : undefined,
              }}
            >
              <div
                className="absolute top-1/2 left-1/2"
                style={{ transform: `translate(${radius - px / 2}px, ${-px / 2}px)` }}
              >
                {point.planet === 'pluto' ? (
                  <span
                    className="block rounded-full bg-[#b9a89a]"
                    style={{ width: px, height: px }}
                  />
                ) : (
                  <img
                    src={`/world/sky/planets/${point.planet}.webp`}
                    alt=""
                    style={{
                      width: px,
                      transform: `rotate(${angle}deg)`,
                      transition:
                        mode === 'settle'
                          ? `transform ${2.2 + index * 0.18}s cubic-bezier(.16,.84,.24,1)`
                          : undefined,
                      filter:
                        point.planet === 'sun'
                          ? 'drop-shadow(0 0 10px rgba(255,190,90,.7))'
                          : undefined,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
