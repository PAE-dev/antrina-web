import { Emphasis } from './Emphasis';

interface SectionHeadingProps {
  title: string;
  eyebrow?: string;
  intro?: string;
  align?: 'center' | 'start';
  id?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  intro,
  align = 'center',
  id,
}: SectionHeadingProps) {
  const isCentered = align === 'center';
  return (
    <header
      className={`flex flex-col gap-5 ${isCentered ? 'items-center text-center' : 'items-start'}`}
    >
      {eyebrow && <p className="type-eyebrow">{eyebrow}</p>}
      <h2 id={id} className="type-h2">
        <Emphasis text={title} />
      </h2>
      <span className="accent-rule" aria-hidden="true" />
      {intro && <p className={`type-body measure ${isCentered ? 'mx-auto' : ''}`}>{intro}</p>}
    </header>
  );
}
