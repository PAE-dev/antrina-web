import { type ComponentType, type SVGProps } from 'react';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from './icons';
import { Logo } from './Logo';
import { type FooterColumn, type LocaleOption, type NavLink } from './types';

export type SocialNetwork = 'instagram' | 'facebook' | 'whatsapp';

export interface SocialLink extends NavLink {
  network: SocialNetwork;
}

const SOCIAL_ICONS: Record<SocialNetwork, ComponentType<SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  whatsapp: WhatsAppIcon,
};

interface SiteFooterProps {
  homeHref: string;
  homeLabel: string;
  slogan: string;
  tagline: string;
  columns: FooterColumn[];
  socials: SocialLink[];
  socialLabel: string;
  locales: LocaleOption[];
  languageLabel: string;
  rights: string;
}

export function SiteFooter({
  homeHref,
  homeLabel,
  slogan,
  tagline,
  columns,
  socials,
  socialLabel,
  locales,
  languageLabel,
  rights,
}: SiteFooterProps) {
  return (
    <footer className="surface-dark">
      <div className="container-page flex flex-col gap-16 pb-8 pt-20 md:gap-24 md:pt-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col items-start gap-6 lg:col-span-5">
            <p className="type-h1 max-w-[12ch]">{slogan}</p>
            <p className="max-w-[340px] text-[15px] leading-relaxed text-on-dark-muted">
              {tagline}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title} className="flex flex-col gap-4">
                <p className="type-label">{column.title}</p>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-[15px] text-on-dark transition-colors hover:text-quartz"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-border-dark pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <Logo href={homeHref} label={homeLabel} tone="dark" />
            <ul className="flex items-center gap-1" aria-label={socialLabel}>
              {socials.map(({ network, label, href }) => {
                const Icon = SOCIAL_ICONS[network];
                return (
                  <li key={network}>
                    <a
                      href={href}
                      aria-label={label}
                      className="inline-flex size-9 items-center justify-center rounded-full text-on-dark-muted transition-colors hover:bg-border-dark hover:text-on-dark"
                    >
                      <Icon />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="type-label flex items-center gap-6">
            <p>
              © {new Date().getFullYear()} Antrina. {rights}
            </p>
            <nav aria-label={languageLabel} className="flex gap-1">
              {locales.map((locale) => (
                <a
                  key={locale.code}
                  href={locale.href}
                  hrefLang={locale.code}
                  aria-current={locale.isActive ? 'true' : undefined}
                  className={`rounded-sm px-1.5 py-0.5 ${
                    locale.isActive ? 'bg-on-dark text-text' : 'hover:text-on-dark'
                  }`}
                >
                  {locale.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
