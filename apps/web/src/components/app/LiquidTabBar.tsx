import { type ReactNode, useEffect, useRef } from 'react';

export interface LiquidTab {
  id: string;
  label: string;
  icon: ReactNode;
  /** El acento de la barra: escanear es la acción principal de la app. */
  isAccent?: boolean;
}

const STRETCH_MS = 520;

/**
 * Menú de vidrio líquido, solo con íconos (el nombre va en `aria-label`): la gota que marca la
 * pestaña activa se estira hacia la otra y rebota al llegar, en vez de deslizarse rígida.
 */
export function LiquidTabBar({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: readonly LiquidTab[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const dropRef = useRef<HTMLSpanElement>(null);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId),
  );
  const previousRef = useRef(activeIndex);

  useEffect(() => {
    const drop = dropRef.current;
    const distance = Math.abs(activeIndex - previousRef.current);
    previousRef.current = activeIndex;
    if (!drop || distance === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const stretch = 1 + Math.min(distance, 3) * 0.28;
    const animation = drop.animate(
      [
        { scale: '1 1' },
        { scale: `${stretch} 0.8`, offset: 0.34 },
        { scale: '0.9 1.1', offset: 0.68 },
        { scale: '1.03 0.98', offset: 0.86 },
        { scale: '1 1' },
      ],
      { duration: STRETCH_MS, easing: 'ease-out' },
    );
    return () => animation.cancel();
  }, [activeIndex]);

  return (
    <nav
      className="liquid-bar"
      aria-label="Menú de la app"
      style={{ '--tabs': tabs.length } as React.CSSProperties}
    >
      <span
        ref={dropRef}
        className="liquid-drop"
        aria-hidden="true"
        style={{
          width: `calc((100% - 12px) / ${tabs.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`liquid-tab ${tab.id === activeId ? 'is-active' : ''} ${
            tab.isAccent ? 'is-accent' : ''
          }`}
          aria-current={tab.id === activeId ? 'page' : undefined}
          aria-label={tab.label}
          title={tab.label}
          onClick={() => onSelect(tab.id)}
        >
          <span className="liquid-icon" aria-hidden="true">
            {tab.icon}
          </span>
        </button>
      ))}
    </nav>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const ForestIcon = () => (
  <Icon>
    <path d="M12 21v-6" />
    <path d="M7 15h10a4 4 0 0 0 .9-7.9A6 6 0 0 0 6.2 7.1 4 4 0 0 0 7 15Z" />
    <path d="M9.5 11.5 12 14l2.5-2.5" />
  </Icon>
);

export const DoorIcon = () => (
  <Icon>
    <path d="M6 21V10a6 6 0 0 1 12 0v11" />
    <path d="M3.5 21h17" />
    <path d="M14.5 13.5v1" />
  </Icon>
);

export const ScanIcon = () => (
  <Icon>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <rect x="8" y="8" width="3" height="3" rx="0.5" />
    <rect x="13" y="13" width="3" height="3" rx="0.5" />
    <path d="M13 8h3v2M8 16v-2h1" />
  </Icon>
);

export const ShopIcon = () => (
  <Icon>
    <path d="M6 8h12l1 12H5L6 8Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </Icon>
);

export const ProfileIcon = () => (
  <Icon>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icon>
);
