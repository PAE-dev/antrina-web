import { SectionHeading } from './SectionHeading';

export interface ZodiacSign {
  name: string;
  dates: string;
  stone: string;
  href: string;
}

interface ZodiacGridProps {
  eyebrow: string;
  title: string;
  intro: string;
  signs: ZodiacSign[];
}

export function ZodiacGrid({ eyebrow, title, intro, signs }: ZodiacGridProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page flex flex-col gap-14 md:gap-20">
        <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
        <ul className="grid grid-cols-2 border-l border-t border-border sm:grid-cols-3 lg:grid-cols-6">
          {signs.map((sign) => (
            <li key={sign.href} className="border-b border-r border-border">
              <a
                href={sign.href}
                className="group flex h-full flex-col items-center gap-2 px-3 py-8 text-center transition-colors hover:bg-surface md:py-10"
              >
                <span className="type-h3 transition-colors group-hover:text-brand">
                  {sign.name}
                </span>
                <span className="text-[13px] text-text-muted">{sign.dates}</span>
                <span className="type-eyebrow mt-1">{sign.stone}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
