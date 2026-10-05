import { ButtonLink } from './ButtonLink';
import { Emphasis } from './Emphasis';
import { Photo } from './Photo';
import { SectionIndex } from './SectionHeading';
import { type CallToAction, type ImageSource } from './types';

interface StorySectionProps {
  label: string;
  index?: number;
  title: string;
  paragraphs: string[];
  imageLabel: string;
  image?: ImageSource;
  cta: CallToAction;
}

export function StorySection({
  label,
  index,
  title,
  paragraphs,
  imageLabel,
  image,
  cta,
}: StorySectionProps) {
  return (
    <section className="section surface-dark">
      <div className="container-page grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <Photo image={image} label={imageLabel} aspect="aspect-[4/5]" className="lg:col-span-5" />
        <div className="flex flex-col items-start gap-6 lg:col-span-6 lg:col-start-7">
          <SectionIndex label={label} index={index} />
          <h2 className="type-h2">
            <Emphasis text={title} />
          </h2>
          <div className="measure flex flex-col gap-5">
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="type-body">
                {paragraph}
              </p>
            ))}
          </div>
          <ButtonLink href={cta.href} variant="inverse" withArrow className="mt-4">
            {cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
