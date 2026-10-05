import { ButtonLink } from './ButtonLink';
import { Emphasis } from './Emphasis';
import { Photo } from './Photo';
import { SectionIndex } from './SectionHeading';
import { type CallToAction, type ImageSource } from './types';

interface CorporateBannerProps {
  label: string;
  index?: number;
  title: string;
  text: string;
  imageLabel: string;
  image?: ImageSource;
  cta: CallToAction;
}

export function CorporateBanner({
  label,
  index,
  title,
  text,
  imageLabel,
  image,
  cta,
}: CorporateBannerProps) {
  return (
    <section className="pb-20 md:pb-32">
      <div className="container-page">
        <div className="grid items-stretch gap-2 rounded-md bg-quartz p-2 md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col items-start justify-between gap-12 p-6 md:p-12 lg:p-16">
            <SectionIndex label={label} index={index} className="text-text-secondary" />
            <div className="flex flex-col items-start gap-6">
              <h2 className="type-h2">
                <Emphasis text={title} />
              </h2>
              <p className="type-body measure text-text-secondary">{text}</p>
              <ButtonLink href={cta.href} withArrow className="mt-2 border-text">
                {cta.label}
              </ButtonLink>
            </div>
          </div>
          <Photo
            image={image}
            label={imageLabel}
            aspect="aspect-[4/3] md:aspect-auto"
            className="bg-surface md:h-full"
          />
        </div>
      </div>
    </section>
  );
}
