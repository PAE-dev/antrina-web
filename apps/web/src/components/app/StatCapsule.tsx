import { type ReactNode } from 'react';

export type StatIcon = 'door' | 'torito' | 'stable' | 'streak';

export interface AppStat {
  label: string;
  value: string;
  icon: StatIcon;
}

const PATHS: Record<StatIcon, ReactNode> = {
  door: (
    <>
      <path d="M6 21V10a6 6 0 0 1 12 0v11" />
      <path d="M4 21h16M14.5 13.5v1" />
    </>
  ),
  torito: (
    <>
      <path d="M5 4c0 3 2 5 4 5h6c2 0 4-2 4-5" />
      <path d="M8 9v6a4 4 0 0 0 8 0V9" />
      <path d="M10.5 16.5h.01M13.5 16.5h.01" />
    </>
  ),
  stable: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6M9 14l6 6M15 14l-6 6" />
    </>
  ),
  streak: <path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 1-3-1-6 1-9.5Z" />,
};

/** Las cifras del cliente en una sola cápsula de vidrio. */
export function StatCapsule({ stats }: { stats: readonly AppStat[] }) {
  return (
    <dl className="app-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="app-stat">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {PATHS[stat.icon]}
          </svg>
          <span className="app-stat-text">
            <dd>{stat.value}</dd>
            <dt>{stat.label}</dt>
          </span>
        </div>
      ))}
    </dl>
  );
}
