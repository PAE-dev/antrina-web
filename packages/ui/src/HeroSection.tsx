import { ButtonLink } from './ButtonLink';
import { Emphasis } from './Emphasis';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { type CallToAction } from './types';

interface HeroSectionProps {
  eyebrow: string;
  title: string;
  text: string;
  primary: CallToAction;
  secondary: CallToAction;
  imageLabel: string;
}

export function HeroSection({
  eyebrow,
  title,
  text,
  primary,
  secondary,
  imageLabel,
}: HeroSectionProps) {
  return (
    <section className="section">
      <div className="container-page grid items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
        <div className="flex flex-col items-start gap-6">
          <p className="type-eyebrow">{eyebrow}</p>
          <h1 className="type-h1">
            <Emphasis text={title} />
          </h1>
          <p className="type-body max-w-[460px]">{text}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-6">
            <ButtonLink href={primary.href} variant="primary">
              {primary.label}
            </ButtonLink>
            <ButtonLink href={secondary.href}>{secondary.label}</ButtonLink>
          </div>
        </div>
        <PhotoPlaceholder label={imageLabel} aspect="aspect-[4/5]" />
      </div>
    </section>
  );
}
