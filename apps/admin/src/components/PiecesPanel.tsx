import { Button, Input, Label, Skeleton, TextField, toast } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type GenerateProductPiecesRequest,
  type ProductPieceDto,
  type ProductPieceListResponse,
} from '@antrina/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { api } from '../lib/api';
import { formatShortDate } from '../lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorNotice } from './ErrorNotice';
import { IconAlert } from './icons';
import { canExportQr, downloadQrZip, isLocalQr, isPrintable } from '../lib/piece-qr';

const MAX_BATCH = 200;

function openLabels(productId: string, range?: { from: number; to: number }) {
  const query = range ? `?desde=${range.from}&hasta=${range.to}` : '';
  window.open(`/etiquetas/${productId}${query}`, '_blank', 'noopener');
}

/** Un código QR por pieza física (o por par): se generan aquí y se descargan o imprimen. */
export function PiecesPanel({
  productId,
  sku,
  name,
  stock,
  isArchived,
}: {
  productId: string;
  sku: string;
  name: string;
  stock: number;
  isArchived: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'pieces', productId];
  const [quantity, setQuantity] = useState<string | null>(null);
  const [lastBatch, setLastBatch] = useState<ProductPieceDto[] | null>(null);
  const [toVoid, setToVoid] = useState<ProductPieceDto | null>(null);

  const pieces = useQuery({
    queryKey,
    queryFn: () =>
      api<ProductPieceListResponse>('GET', ADMIN_CATALOG_ROUTES.productPieces(productId)),
  });
  const rows = pieces.data?.data ?? [];
  const free = rows.filter(isPrintable);
  const used = rows.filter((piece) => piece.claimedAt).length;
  const active = rows.filter((piece) => !piece.voidedAt).length;
  const lastRange =
    lastBatch && lastBatch[0]
      ? { from: lastBatch[0].serial, to: lastBatch.at(-1)?.serial ?? lastBatch[0].serial }
      : null;
  const suggested = String(Math.min(Math.max(stock - active, 1), MAX_BATCH));
  const value = quantity ?? suggested;
  const amount = Number(value);
  const isValid = Number.isInteger(amount) && amount >= 1 && amount <= MAX_BATCH;

  const generate = useMutation({
    mutationFn: () => {
      const body: GenerateProductPiecesRequest = { quantity: amount };
      return api<ProductPieceListResponse>(
        'POST',
        ADMIN_CATALOG_ROUTES.productPieces(productId),
        body,
      );
    },
    onSuccess: ({ data }) => {
      void queryClient.invalidateQueries({ queryKey });
      setLastBatch(data);
      setQuantity(null);
      toast.success(data.length === 1 ? 'Código generado' : `${data.length} códigos generados`);
    },
  });

  const download = useMutation({
    mutationFn: (batch: readonly ProductPieceDto[]) => downloadQrZip(batch, { sku, name }),
  });

  const voidPiece = useMutation({
    mutationFn: (piece: ProductPieceDto) =>
      api<ProductPieceDto>('POST', ADMIN_CATALOG_ROUTES.voidProductPiece(productId, piece.id)),
    onSuccess: (piece) => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success(`Código Nº ${piece.serial} anulado`);
    },
    onSettled: () => setToVoid(null),
  });

  return (
    <div className="flex flex-col gap-5">
      {!canExportQr && (
        <Notice>
          Falta configurar la dirección de la tienda (`VITE_STORE_URL`). Sin ella el QR no abriría
          nada, así que la descarga y la impresión están bloqueadas.
        </Notice>
      )}
      {isLocalQr && (
        <Notice>
          Estás en local: estos QR apuntan a este computador y solo existen en su base de datos.
          Sirven para probar, no para pegarlos en piezas. Genera los definitivos en el panel de
          producción.
        </Notice>
      )}
      {pieces.data && !pieces.data.opensTorito && (
        <Notice>
          Este producto no está en una categoría de toritos, así que su QR solo confirma que la
          pieza es auténtica. Para que abra el nacimiento y el establo, usa una categoría cuya
          dirección empiece por «torito».
        </Notice>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="panel-heading">Generar códigos</h3>
          <p className="text-[13px] text-text-muted">
            Cada código es único y no se repite. Pega cada uno en una sola pieza: volver a descargar
            trae los mismos códigos, no crea otros.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <TextField type="number" value={value} onChange={setQuantity} className="w-28">
            <Label>Cantidad</Label>
            <Input min={1} max={MAX_BATCH} step={1} className="panel-num" />
          </TextField>
          <Button
            variant="secondary"
            isPending={generate.isPending}
            isDisabled={!isValid || isArchived}
            onPress={() => generate.mutate()}
          >
            Generar
          </Button>
          {lastBatch && lastRange && (
            <>
              <Button
                variant="secondary"
                isPending={download.isPending}
                isDisabled={!canExportQr}
                onPress={() => download.mutate(lastBatch)}
              >
                Descargar estos {lastBatch.length}
              </Button>
              <Button
                variant="tertiary"
                isDisabled={!canExportQr}
                onPress={() => openLabels(productId, lastRange)}
              >
                Imprimir estos
              </Button>
            </>
          )}
        </div>
        <p className="panel-meta panel-num">
          {stock} en stock · {free.length} {free.length === 1 ? 'libre' : 'libres'} · {used}{' '}
          {used === 1 ? 'usado' : 'usados'}
          {isArchived && ' · Producto archivado: no se pueden generar más'}
        </p>
        <ErrorNotice error={generate.error} title="No se pudieron generar" />
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
          <h3 className="panel-heading">Códigos</h3>
          {free.length > 0 && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="tertiary"
                isPending={download.isPending}
                isDisabled={!canExportQr}
                onPress={() => download.mutate(free)}
              >
                Descargar libres
              </Button>
              <Button
                size="sm"
                variant="tertiary"
                isDisabled={!canExportQr}
                onPress={() => openLabels(productId)}
              >
                Imprimir etiquetas
              </Button>
            </div>
          )}
        </div>
        <ErrorNotice error={download.error} title="No se pudo descargar" />
        <ErrorNotice error={pieces.error} title="No se pudieron cargar los códigos" />
        <ErrorNotice error={voidPiece.error} title="No se pudo anular" />
        {pieces.isPending ? (
          <Skeleton className="h-24 w-full rounded-md" />
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-text-muted">Este producto aún no tiene códigos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {rows.map((piece) => (
              <li key={piece.id} className="flex items-center gap-3 px-3 py-2">
                <span className="panel-num w-12 text-[13px] font-medium text-text">
                  Nº {piece.serial}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate font-mono text-[12.5px] ${piece.voidedAt ? 'text-text-muted line-through' : 'text-text-secondary'}`}
                >
                  {piece.code}
                </span>
                <span className="panel-meta hidden whitespace-nowrap sm:inline">
                  {formatShortDate(piece.claimedAt ?? piece.createdAt)}
                </span>
                {piece.voidedAt ? (
                  <span className="text-[12.5px] text-text-muted">Anulado</span>
                ) : piece.claimedAt ? (
                  <span className="text-[12.5px] font-medium text-success">Usado</span>
                ) : (
                  <Button size="sm" variant="ghost" onPress={() => setToVoid(piece)}>
                    Anular
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={toVoid !== null}
        onOpenChange={(open) => !open && setToVoid(null)}
        title={`¿Anular el código Nº ${toVoid?.serial ?? ''}?`}
        confirmLabel="Anular"
        tone="warning"
        isPending={voidPiece.isPending}
        onConfirm={() => toVoid && voidPiece.mutate(toVoid)}
      >
        Úsalo si la etiqueta se perdió o se dañó. El código dejará de ser válido y no se puede
        reactivar.
      </ConfirmDialog>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-md bg-warning-tint px-3 py-2.5 text-[13px] text-warning">
      <IconAlert size={16} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
