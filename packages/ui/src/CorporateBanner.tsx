import { ButtonLink } from './ButtonLink';
import { Emphasis } from './Emphasis';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { type CallToAction } from './types';

interface CorporateBannerProps {
  eyebrow: string;
  title: string;
  text: string;
  imageLabel: string;
  cta: CallToAction;
}

export function CorporateBanner({ eyebrow, title, text, imageLabel, cta }: CorporateBannerProps) {
  return (
    <section className="section">
      <div className="container-page">
        <div className="grid items-stretch border border-border bg-surface md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col items-start justify-center gap-6 p-8 md:p-14 lg:p-20">
            <p className="type-eyebrow">{eyebrow}</p>
            <h2 className="type-h2">
              <Emphasis text={title} />
            </h2>
            <p className="type-body measure">{text}</p>
            <ButtonLink href={cta.href} className="mt-2">
              {cta.label}
            </ButtonLink>
          </div>
          <PhotoPlaceholder
            label={imageLabel}
            aspect="aspect-[4/3] md:aspect-auto"
            className="md:h-full"
          />
        </div>
      </div>
    </section>
  );
}
