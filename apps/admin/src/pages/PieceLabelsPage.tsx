import { Button, Input, Label, Spinner, TextField } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdminProductDto,
  type ProductPieceDto,
  type ProductPieceListResponse,
} from '@antrina/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { Choice } from '../components/PageKit';
import { QrCode } from '../components/QrCode';
import { api } from '../lib/api';
import { canExportQr, downloadQrZip, isLocalQr, isPrintable, pieceQrUrl } from '../lib/piece-qr';

const COPY_OPTIONS = [
  { id: '1', label: '1 por código' },
  { id: '2', label: '2 por código (par)' },
];

/** Hoja de etiquetas para imprimir o descargar, sin el marco del panel. */
export function PieceLabelsPage() {
  const { productId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [from, setFrom] = useState(searchParams.get('desde') ?? '');
  const [to, setTo] = useState(searchParams.get('hasta') ?? '');
  const [copies, setCopies] = useState('1');

  const product = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: () => api<AdminProductDto>('GET', ADMIN_CATALOG_ROUTES.product(productId)),
  });
  const pieces = useQuery({
    queryKey: ['admin', 'pieces', productId],
    queryFn: () =>
      api<ProductPieceListResponse>('GET', ADMIN_CATALOG_ROUTES.productPieces(productId)),
  });
  const download = useMutation({
    mutationFn: (input: { selected: ProductPieceDto[]; sku: string; name: string }) =>
      downloadQrZip(input.selected, input),
  });

  const error = product.error ?? pieces.error;
  if (error) {
    return (
      <div className="p-6">
        <ErrorNotice error={error} title="No se pudieron cargar las etiquetas" />
      </div>
    );
  }
  if (!product.data || !pieces.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const name = product.data.content.es.name;
  const { sku } = product.data;
  const { opensTorito } = pieces.data;
  const selected = pieces.data.data
    .filter(
      (piece) =>
        isPrintable(piece) &&
        (!from || piece.serial >= Number(from)) &&
        (!to || piece.serial <= Number(to)),
    )
    .sort((a, b) => a.serial - b.serial);
  // Un torito es una sola pieza: dos etiquetas iguales harían que el segundo no pueda despertar.
  const labels = selected.flatMap((piece) =>
    Array.from({ length: opensTorito ? 1 : Number(copies) }, () => piece),
  );

  return (
    <main className="min-h-screen bg-surface">
      <div className="flex flex-col gap-4 border-b border-border p-6 print:hidden">
        <div className="flex flex-col gap-0.5">
          <h1 className="panel-title">Etiquetas de {name}</h1>
          <p className="text-[13.5px] text-text-secondary">
            Imprime al 100 % de escala y prueba con el celular antes de pegar las etiquetas.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <TextField type="number" value={from} onChange={setFrom} className="w-24">
            <Label>Desde Nº</Label>
            <Input min={1} className="panel-num" />
          </TextField>
          <TextField type="number" value={to} onChange={setTo} className="w-24">
            <Label>Hasta Nº</Label>
            <Input min={1} className="panel-num" />
          </TextField>
          {!opensTorito && (
            <Choice
              label="Etiquetas"
              value={copies}
              options={COPY_OPTIONS}
              onChange={setCopies}
              className="w-52"
            />
          )}
          <Button
            variant="primary"
            isDisabled={labels.length === 0 || !canExportQr}
            onPress={() => window.print()}
          >
            Imprimir {labels.length}
          </Button>
          <Button
            variant="secondary"
            isPending={download.isPending}
            isDisabled={selected.length === 0 || !canExportQr}
            onPress={() => download.mutate({ selected, sku, name })}
          >
            Descargar {selected.length}
          </Button>
        </div>
        <ErrorNotice error={download.error} title="No se pudo descargar" />
        {isLocalQr && (
          <p className="text-[13px] text-warning">
            Estás en local: estos QR apuntan a este computador. No los pegues en piezas.
          </p>
        )}
      </div>

      {labels.length === 0 ? (
        <p className="p-6 text-[13.5px] text-text-muted">
          No hay códigos libres en este rango. Los usados y los anulados no se vuelven a imprimir.
        </p>
      ) : (
        <div className="label-sheet p-6 print:p-0">
          {labels.map((piece, index) => (
            <article key={`${piece.id}-${index}`} className="piece-label">
              <QrCode
                value={pieceQrUrl(piece.code)}
                label={`QR de ${name}, número ${piece.serial}`}
                className="piece-label-qr"
              />
              <p className="piece-label-name">{name}</p>
              <p className="piece-label-code">
                Nº {piece.serial} · {piece.code}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
