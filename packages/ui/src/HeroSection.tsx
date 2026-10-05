import { ArrowLink, ButtonLink } from './ButtonLink';
import { Emphasis } from './Emphasis';
import { Photo } from './Photo';
import { type CallToAction, type ImageSource } from './types';

interface HeroSectionProps {
  eyebrow: string;
  title: string;
  text: string;
  primary: CallToAction;
  secondary: CallToAction;
  imageLabel: string;
  /** Foto subida desde el panel (Portada); sin ella se muestra el hueco. */
  image?: ImageSource;
  /** Pie de foto en mono, p. ej. "Amatista y cuarzo rosa · 32 cm". */
  caption: string;
}

export function HeroSection({
  eyebrow,
  title,
  text,
  primary,
  secondary,
  imageLabel,
  image,
  caption,
}: HeroSectionProps) {
  return (
    <section className="pb-20 pt-8 md:pb-32 md:pt-14">
      <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col justify-between gap-10 lg:col-span-7 lg:py-6">
          <p className="type-label inline-flex items-center gap-2.5 text-text-secondary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-clay" />
            {eyebrow}
          </p>
          <h1 className="type-display max-w-[11ch]">
            <Emphasis text={title} />
          </h1>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between lg:flex-col lg:items-start xl:flex-row xl:items-end">
            <p className="type-body max-w-[420px]">{text}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <ButtonLink href={primary.href} variant="primary" withArrow>
                {primary.label}
              </ButtonLink>
              <ArrowLink href={secondary.href}>{secondary.label}</ArrowLink>
            </div>
          </div>
        </div>

        <figure className="flex flex-col gap-3 lg:col-span-5">
          <Photo image={image} label={imageLabel} aspect="aspect-[4/5]" priority />
          <figcaption className="type-label flex items-center justify-between gap-4">
            <span className="shrink-0">N.º&nbsp;001</span>
            <span className="text-right">{caption}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
