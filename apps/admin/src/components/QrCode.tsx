import QRCode from 'qrcode';
import { useMemo } from 'react';

/** Margen de 4 módulos que exige el estándar para que los lectores encuentren el código. */
const QUIET_ZONE = 4;

/** QR en SVG con el color del texto: se imprime nítido a cualquier tamaño. */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const { path, size } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let row = 0; row < modules.size; row++) {
      for (let column = 0; column < modules.size; column++) {
        if (modules.get(row, column)) d += `M${column} ${row}h1v1h-1z`;
      }
    }
    return { path: d, size: modules.size };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${size + QUIET_ZONE * 2} ${size + QUIET_ZONE * 2}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
