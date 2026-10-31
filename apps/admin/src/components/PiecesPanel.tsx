import { Button, Input, Label, Skeleton, TextField, toast } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type GenerateProductPiecesRequest,
  type ProductPieceDto,
  type ProductPieceListResponse,
} from '@antrina/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { formatShortDate } from '../lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorNotice } from './ErrorNotice';
import { IconAlert } from './icons';

const MAX_BATCH = 200;

function openLabels(productId: string, range?: { from: number; to: number }) {
  const query = range ? `?desde=${range.from}&hasta=${range.to}` : '';
  window.open(`/etiquetas/${productId}${query}`, '_blank', 'noopener');
}

/** Un código QR por pieza física (o por par): se generan aquí y se imprimen como etiquetas. */
export function PiecesPanel({
  productId,
  stock,
  isArchived,
}: {
  productId: string;
  stock: number;
  isArchived: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'pieces', productId];
  const [quantity, setQuantity] = useState<string | null>(null);
  const [lastBatch, setLastBatch] = useState<{ from: number; to: number } | null>(null);
  const [toVoid, setToVoid] = useState<ProductPieceDto | null>(null);

  const pieces = useQuery({
    queryKey,
    queryFn: () =>
      api<ProductPieceListResponse>('GET', ADMIN_CATALOG_ROUTES.productPieces(productId)),
  });
  const rows = pieces.data?.data ?? [];
  const active = rows.filter((piece) => !piece.voidedAt).length;
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
      const [first] = data;
      const last = data.at(-1);
      if (first && last) setLastBatch({ from: first.serial, to: last.serial });
      setQuantity(null);
      toast.success(data.length === 1 ? 'Código generado' : `${data.length} códigos generados`);
    },
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
      <div className="flex gap-2.5 rounded-md bg-warning-tint px-3 py-2.5 text-[13px] text-warning">
        <IconAlert size={16} className="mt-0.5 shrink-0" />
        <p>
          La página que abre el QR todavía no está en la tienda. Puedes generar códigos y hacer una
          prueba de impresión, pero no pegues etiquetas en piezas que vayas a vender.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="panel-heading">Generar códigos</h3>
          <p className="text-[13px] text-text-muted">
            Un código por cada pieza que vendes: si se vende en par, un código para el par.
          </p>
        </div>
        <div className="flex items-end gap-2">
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
          {lastBatch && (
            <Button variant="tertiary" onPress={() => openLabels(productId, lastBatch)}>
              Imprimir estos
            </Button>
          )}
        </div>
        <p className="panel-meta panel-num">
          {stock} en stock · {active} {active === 1 ? 'código activo' : 'códigos activos'}
          {isArchived && ' · Producto archivado: no se pueden generar más'}
        </p>
        <ErrorNotice error={generate.error} title="No se pudieron generar" />
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h3 className="panel-heading">Códigos</h3>
          {active > 0 && (
            <Button size="sm" variant="tertiary" onPress={() => openLabels(productId)}>
              Imprimir etiquetas
            </Button>
          )}
        </div>
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
                  {formatShortDate(piece.createdAt)}
                </span>
                {piece.voidedAt ? (
                  <span className="text-[12.5px] text-text-muted">Anulado</span>
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
