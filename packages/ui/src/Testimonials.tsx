import { PhotoPlaceholder } from './PhotoPlaceholder';
import { SectionHeading } from './SectionHeading';

export interface Testimonial {
  quote: string;
  author: string;
  place: string;
  product: string;
}

interface TestimonialsProps {
  eyebrow: string;
  title: string;
  photoLabel: string;
  items: Testimonial[];
}

export function Testimonials({ eyebrow, title, photoLabel, items }: TestimonialsProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page flex flex-col gap-14 md:gap-20">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <ul className="grid gap-14 md:grid-cols-3 md:gap-10 lg:gap-16">
          {items.map((item) => (
            <li key={item.author}>
              <figure className="flex flex-col gap-6">
                <PhotoPlaceholder label={photoLabel} aspect="aspect-[4/3]" />
                <blockquote className="font-display text-[22px] font-medium italic leading-snug text-text">
                  “{item.quote}”
                </blockquote>
                <figcaption className="flex flex-col gap-1">
                  <span className="text-[15px] font-medium text-text">{item.author}</span>
                  <span className="text-[13px] text-text-muted">
                    {item.place} · {item.product}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
