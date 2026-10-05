import { Card } from '@heroui/react';
import { ArrowUpRightIcon } from './icons';
import { SectionHeading } from './SectionHeading';

export interface IntentionItem {
  title: string;
  stones: string;
  text: string;
  href: string;
}

interface IntentionCardsProps {
  label: string;
  index?: number;
  title: string;
  intro: string;
  items: IntentionItem[];
}

export function IntentionCards({ label, index, title, intro, items }: IntentionCardsProps) {
  return (
    <section id="intenciones" className="section border-t border-border">
      <div className="container-page flex flex-col gap-12 md:gap-16">
        <SectionHeading label={label} index={index} title={title} intro={intro} />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((item, position) => (
            <li key={item.href}>
              <a href={item.href} className="group block h-full rounded-md">
                <Card className="h-full justify-between gap-8 border border-border bg-surface p-5 transition-colors duration-300 group-hover:border-quartz group-hover:bg-quartz md:min-h-[300px]">
                  <div className="flex items-start justify-between">
                    <span className="type-label">{String(position + 1).padStart(2, '0')}</span>
                    <ArrowUpRightIcon className="text-text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text" />
                  </div>
                  <Card.Header className="gap-3">
                    <Card.Title className="type-h3">{item.title}</Card.Title>
                    <p className="type-label text-clay">{item.stones}</p>
                    <Card.Description className="text-[14.5px] leading-relaxed text-text-secondary">
                      {item.text}
                    </Card.Description>
                  </Card.Header>
                </Card>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
