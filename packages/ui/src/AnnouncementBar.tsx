import { type LocaleOption } from './types';

interface AnnouncementBarProps {
  message: string;
  note?: string;
  locales: LocaleOption[];
  languageLabel: string;
}

export function AnnouncementBar({ message, note, locales, languageLabel }: AnnouncementBarProps) {
  return (
    <div className="bg-text text-on-dark">
      <div className="container-page flex h-9 items-center justify-between gap-6 text-[12.5px]">
        <p className="truncate">{message}</p>
        <div className="flex items-center gap-6">
          {note && <p className="hidden text-on-dark-muted md:block">{note}</p>}
          <nav aria-label={languageLabel} className="flex items-center gap-1 font-mono">
            {locales.map((locale) => (
              <a
                key={locale.code}
                href={locale.href}
                hrefLang={locale.code}
                aria-current={locale.isActive ? 'true' : undefined}
                className={`rounded-sm px-1.5 py-0.5 transition-colors ${
                  locale.isActive ? 'bg-on-dark text-text' : 'text-on-dark-muted hover:text-on-dark'
                }`}
              >
                {locale.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
