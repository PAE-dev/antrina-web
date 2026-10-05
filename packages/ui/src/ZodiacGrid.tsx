import { SectionHeading } from './SectionHeading';

export interface ZodiacSign {
  name: string;
  dates: string;
  stone: string;
  href: string;
}

interface ZodiacGridProps {
  label: string;
  index?: number;
  title: string;
  intro: string;
  signs: ZodiacSign[];
}

export function ZodiacGrid({ label, index, title, intro, signs }: ZodiacGridProps) {
  return (
    <section className="section">
      <div className="container-page flex flex-col gap-12 md:gap-16">
        <SectionHeading label={label} index={index} title={title} intro={intro} />
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {signs.map((sign) => (
            <li key={sign.href} className="bg-bg">
              <a
                href={sign.href}
                className="group flex h-full flex-col gap-6 p-5 transition-colors duration-300 hover:bg-quartz md:p-6"
              >
                <span className="type-label">{sign.dates}</span>
                <span className="flex flex-col gap-1.5">
                  <span className="font-display text-[22px] font-medium leading-none tracking-[-0.03em] text-text">
                    {sign.name}
                  </span>
                  <span className="type-label inline-flex items-center gap-2 text-text-secondary">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-clay" />
                    {sign.stone}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
