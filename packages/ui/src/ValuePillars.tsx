import { type ComponentType, type SVGProps } from 'react';
import { HandIcon, StoneIcon, TreeIcon } from './icons';
import { SectionHeading } from './SectionHeading';

export type PillarIcon = 'hand' | 'stone' | 'tree';

export interface Pillar {
  icon: PillarIcon;
  title: string;
  text: string;
}

const ICONS: Record<PillarIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  hand: HandIcon,
  stone: StoneIcon,
  tree: TreeIcon,
};

interface ValuePillarsProps {
  title: string;
  pillars: Pillar[];
}

export function ValuePillars({ title, pillars }: ValuePillarsProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page flex flex-col gap-14 md:gap-20">
        <SectionHeading title={title} />
        <ul className="grid gap-12 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
          {pillars.map(({ icon, title: pillarTitle, text }) => {
            const Icon = ICONS[icon];
            return (
              <li
                key={pillarTitle}
                className="flex flex-col items-center gap-4 text-center md:px-10"
              >
                <Icon className="text-text" />
                <h3 className="type-h3">{pillarTitle}</h3>
                <p className="type-body max-w-[320px]">{text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
