import { PhotoPlaceholder } from './PhotoPlaceholder';
import { SectionHeading } from './SectionHeading';

export interface IntentionItem {
  title: string;
  stones: string;
  text: string;
  href: string;
}

interface IntentionCardsProps {
  eyebrow: string;
  title: string;
  intro: string;
  imageLabel: string;
  items: IntentionItem[];
}

export function IntentionCards({ eyebrow, title, intro, imageLabel, items }: IntentionCardsProps) {
  return (
    <section id="intenciones" className="section border-t border-border">
      <div className="container-page flex flex-col gap-14 md:gap-20">
        <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
        <ul className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-8">
          {items.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="group flex flex-col gap-4">
                <div className="overflow-hidden">
                  <PhotoPlaceholder
                    label={imageLabel}
                    className="transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="type-h3 transition-colors group-hover:text-brand">{item.title}</h3>
                  <p className="type-eyebrow">{item.stones}</p>
                  <p className="text-[15px] leading-relaxed text-text-secondary">{item.text}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
