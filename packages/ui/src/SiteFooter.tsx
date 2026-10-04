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
    <footer className="border-t border-border bg-bg-alt">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-12 py-[72px] md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-10 md:py-24">
        <div className="col-span-2 flex flex-col items-start gap-5 md:col-span-1">
          <Logo href={homeHref} label={homeLabel} />
          <p className="font-display text-[22px] italic leading-snug text-brand">{slogan}</p>
          <p className="max-w-[300px] text-[15px] leading-relaxed text-text-secondary">{tagline}</p>
          <ul className="mt-2 flex items-center gap-4" aria-label={socialLabel}>
            {socials.map(({ network, label, href }) => {
              const Icon = SOCIAL_ICONS[network];
              return (
                <li key={network}>
                  <a
                    href={href}
                    aria-label={label}
                    className="text-text transition-colors hover:text-brand"
                  >
                    <Icon />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-5">
            <p className="type-eyebrow">{column.title}</p>
            <ul className="flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[15px] text-text-secondary transition-colors hover:text-brand"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-[13px] text-text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} Antrina. {rights}
          </p>
          <nav aria-label={languageLabel} className="flex gap-4">
            {locales.map((locale) => (
              <a
                key={locale.code}
                href={locale.href}
                hrefLang={locale.code}
                aria-current={locale.isActive ? 'true' : undefined}
                className={
                  locale.isActive ? 'text-text underline underline-offset-4' : 'hover:text-text'
                }
              >
                {locale.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
