import { SectionHeading } from './SectionHeading';

export interface Testimonial {
  quote: string;
  author: string;
  place: string;
  product: string;
}

interface TestimonialsProps {
  label: string;
  index?: number;
  title: string;
  items: Testimonial[];
}

export function Testimonials({ label, index, title, items }: TestimonialsProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page flex flex-col gap-12 md:gap-16">
        <SectionHeading label={label} index={index} title={title} />
        <ul className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <li key={item.author}>
              <figure className="flex h-full flex-col justify-between gap-10 rounded-md bg-surface p-6 md:p-8">
                <blockquote className="font-display text-[21px] font-normal leading-[1.3] tracking-[-0.02em] text-text md:text-[23px]">
                  “{item.quote}”
                </blockquote>
                <figcaption className="flex items-end justify-between gap-4 border-t border-border pt-5">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-medium text-text">{item.author}</span>
                    <span className="type-label">{item.place}</span>
                  </span>
                  <span className="type-label text-right text-clay">{item.product}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
