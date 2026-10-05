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
  label: string;
  index?: number;
  title: string;
  pillars: Pillar[];
}

export function ValuePillars({ label, index, title, pillars }: ValuePillarsProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page flex flex-col gap-12 md:gap-16">
        <SectionHeading label={label} index={index} title={title} />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
          {pillars.map(({ icon, title: pillarTitle, text }, position) => {
            const Icon = ICONS[icon];
            return (
              <li key={pillarTitle} className="flex flex-col gap-4 border-t border-text pt-5">
                <div className="flex items-center justify-between">
                  <span className="type-label">{String(position + 1).padStart(2, '0')}</span>
                  <Icon className="text-text-muted" />
                </div>
                <h3 className="type-h3 mt-6">{pillarTitle}</h3>
                <p className="type-body max-w-[360px]">{text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
