import { Fragment } from 'react';

/**
 * Convierte `*palabras*` en `<em>`: en títulos se ven en Cormorant itálica color marca.
 * Ej.: "Arraigado en *tu intención*". Usar en 1–2 palabras clave como máximo.
 */
export function Emphasis({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <em key={index}>{part}</em> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}

export function stripEmphasis(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1');
}
