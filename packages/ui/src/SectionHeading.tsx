import { type ReactNode } from 'react';
import { Emphasis } from './Emphasis';

interface SectionHeadingProps {
  title: string;
  /** Etiqueta corta del índice de sección, p. ej. "Intenciones". */
  label?: string;
  /** Número de sección en la página: se muestra como "02". */
  index?: number;
  intro?: string;
  id?: string;
  /** Contenido a la derecha del título en escritorio (p. ej. un enlace "Ver todo"). */
  aside?: ReactNode;
}

/** "02 — Favoritos": número de sección en mono seguido de una línea fina. */
export function SectionIndex({
  label,
  index,
  className = '',
}: {
  label: string;
  index?: number;
  className?: string;
}) {
  return (
    <p className={`section-index ${className}`.trim()}>
      {index !== undefined && `${String(index).padStart(2, '0')} — `}
      {label}
    </p>
  );
}

export function SectionHeading({ title, label, index, intro, id, aside }: SectionHeadingProps) {
  return (
    <header className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end md:gap-12">
      <div className="flex max-w-[820px] flex-col gap-5">
        {label && <SectionIndex label={label} index={index} />}
        <h2 id={id} className="type-h2">
          <Emphasis text={title} />
        </h2>
        {intro && <p className="type-body measure">{intro}</p>}
      </div>
      {aside && <div className="md:pb-2">{aside}</div>}
    </header>
  );
}
