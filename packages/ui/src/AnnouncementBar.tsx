import { type LocaleOption, type NavLink } from './types';

interface AnnouncementBarProps {
  message: string;
  highlights: NavLink[];
  locales: LocaleOption[];
  languageLabel: string;
}

export function AnnouncementBar({
  message,
  highlights,
  locales,
  languageLabel,
}: AnnouncementBarProps) {
  return (
    <div>
      <div className="bg-brand text-bg">
        <div className="container-page grid min-h-9 grid-cols-1 items-center py-2 md:grid-cols-[1fr_auto_1fr]">
          <span className="hidden md:block" aria-hidden="true" />
          <p className="text-center text-[12px] font-medium uppercase leading-snug tracking-[0.16em]">
            {message}
          </p>
          <nav aria-label={languageLabel} className="hidden items-center justify-end gap-3 md:flex">
            {locales.map((locale) => (
              <a
                key={locale.code}
                href={locale.href}
                hrefLang={locale.code}
                aria-current={locale.isActive ? 'true' : undefined}
                className={`text-[12px] tracking-[0.16em] transition-opacity ${
                  locale.isActive ? 'underline underline-offset-4' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {locale.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-b border-border bg-bg">
        <ul className="container-page grid min-h-10 grid-cols-1 items-center text-[13px] text-text-secondary md:grid-cols-3 md:divide-x md:divide-border">
          {highlights.map((item, index) => (
            <li
              key={item.href}
              className={`items-center justify-center py-2 text-center ${index === 1 ? 'flex' : 'hidden md:flex'}`}
            >
              <a href={item.href} className="transition-colors hover:text-brand">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
