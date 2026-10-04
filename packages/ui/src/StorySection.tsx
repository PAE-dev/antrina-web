import { ButtonLink } from './ButtonLink';
import { Emphasis } from './Emphasis';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { type CallToAction } from './types';

interface StorySectionProps {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  imageLabel: string;
  cta: CallToAction;
}

export function StorySection({ eyebrow, title, paragraphs, imageLabel, cta }: StorySectionProps) {
  return (
    <section className="section border-t border-border bg-surface">
      <div className="container-page grid items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
        <PhotoPlaceholder label={imageLabel} aspect="aspect-[4/5]" />
        <div className="flex flex-col items-start gap-6">
          <p className="type-eyebrow">{eyebrow}</p>
          <h2 className="type-h2">
            <Emphasis text={title} />
          </h2>
          <span className="accent-rule" aria-hidden="true" />
          <div className="measure flex flex-col gap-5">
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="type-body">
                {paragraph}
              </p>
            ))}
          </div>
          <ButtonLink href={cta.href} className="mt-2">
            {cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
