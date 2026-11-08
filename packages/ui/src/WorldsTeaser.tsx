import { ButtonLink } from './ButtonLink';
import { Emphasis } from './Emphasis';
import { SectionIndex } from './SectionHeading';
import { type CallToAction } from './types';

interface DoorImage {
  src: string;
  width: number;
  height: number;
}

interface WorldsTeaserProps {
  index?: number;
  label: string;
  title: string;
  text: string;
  /** La puerta del centro y las dos que la acompañan. */
  doors: { center: DoorImage; left: DoorImage; right: DoorImage };
  moonSrc: string;
  imageAlt: string;
  cta: CallToAction;
  demo: CallToAction;
}

/** La entrada a los mundos desde la tienda: se ven las puertas y se invita a cruzarlas. */
export function WorldsTeaser({
  index,
  label,
  title,
  text,
  doors,
  moonSrc,
  imageAlt,
  cta,
  demo,
}: WorldsTeaserProps) {
  return (
    <section className="section surface-dark overflow-hidden">
      <div className="container-page grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <a
          href={cta.href}
          aria-label={imageAlt}
          className="group relative flex aspect-[5/4] items-end justify-center overflow-hidden rounded-md bg-brand lg:col-span-6"
        >
          <img
            src={moonSrc}
            alt=""
            width={114}
            height={114}
            loading="lazy"
            className="absolute right-[14%] top-[9%] w-[16%] opacity-90"
          />
          <img
            src={doors.left.src}
            alt=""
            width={doors.left.width}
            height={doors.left.height}
            loading="lazy"
            className="absolute bottom-[6%] left-[3%] w-[30%] opacity-55 brightness-75"
          />
          <img
            src={doors.right.src}
            alt=""
            width={doors.right.width}
            height={doors.right.height}
            loading="lazy"
            className="absolute bottom-[6%] right-[3%] w-[31%] opacity-55 brightness-75"
          />
          <img
            src={doors.center.src}
            alt=""
            width={doors.center.width}
            height={doors.center.height}
            loading="lazy"
            className="relative mb-[4%] w-[48%] transition-transform duration-[400ms] group-hover:scale-[1.03]"
          />
        </a>
        <div className="flex flex-col items-start gap-6 lg:col-span-5 lg:col-start-8">
          <SectionIndex label={label} index={index} />
          <h2 className="type-h2">
            <Emphasis text={title} />
          </h2>
          <p className="type-body measure">{text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-5">
            <ButtonLink href={cta.href} variant="inverse" withArrow>
              {cta.label}
            </ButtonLink>
            <a
              href={demo.href}
              className="text-[15px] font-medium text-on-dark underline decoration-on-dark/50 underline-offset-[6px] transition-colors hover:decoration-current"
            >
              {demo.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
