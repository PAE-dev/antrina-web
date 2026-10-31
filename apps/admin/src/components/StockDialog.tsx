import {
  Button,
  Description,
  Input,
  Label,
  Modal,
  TextField,
  toast,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type AdjustStockRequest,
  type StockMovementDto,
} from '@antrina/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { ErrorNotice } from './ErrorNotice';
import { IconMinus, IconPlus } from './icons';

export interface StockTarget {
  id: string;
  name: string;
  stock: number;
}

type Mode = 'in' | 'out' | 'count';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'in', label: 'Entrada', hint: 'Llegó mercadería o terminaste nuevas piezas.' },
  {
    id: 'out',
    label: 'Salida',
    hint: 'Merma, regalo o pieza rota. Si es una venta, regístrala en Ventas.',
  },
  {
    id: 'count',
    label: 'Contar',
    hint: 'Escribe cuántas hay de verdad y se corrige la diferencia.',
  },
];

/** Vuelve a pedir todo lo que muestra existencias. */
export function invalidateStock(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of ['products', 'product', 'stock-movements', 'dashboard']) {
    void queryClient.invalidateQueries({ queryKey: ['admin', key] });
  }
}

/** Cambiar existencias en dos clics: cantidad, nota opcional y queda en el historial. */
export function StockDialog({
  target,
  onClose,
}: {
  target: StockTarget | null;
  onClose: () => void;
}) {
  return (
    <Modal.Backdrop isOpen={target !== null} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="sm">
        <Modal.Dialog aria-label="Cambiar stock">
          {target && <StockForm key={target.id} target={target} onClose={onClose} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function StockForm({ target, onClose }: { target: StockTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('in');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');

  const amount = Number(quantity);
  const isValid = quantity.trim() !== '' && Number.isInteger(amount) && amount >= 0;
  const delta = !isValid
    ? 0
    : mode === 'in'
      ? amount
      : mode === 'out'
        ? -amount
        : amount - target.stock;
  const after = target.stock + delta;

  const save = useMutation({
    mutationFn: (body: AdjustStockRequest) =>
      api<StockMovementDto>('POST', ADMIN_CATALOG_ROUTES.productStock(target.id), body),
    onSuccess: (movement) => {
      invalidateStock(queryClient);
      toast.success(`Stock actualizado: ${movement.stockAfter}`, { description: target.name });
      onClose();
    },
  });

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (delta === 0 || after < 0) return;
    save.mutate({
      type: mode === 'in' ? 'RESTOCK' : 'ADJUSTMENT',
      quantity: delta,
      note: note.trim() || null,
    });
  };

  return (
    <>
      <Modal.Header className="flex flex-col gap-0.5">
        <Modal.Heading className="text-[15px] font-semibold tracking-[-0.01em]">
          Cambiar stock
        </Modal.Heading>
        <p className="truncate text-[13px] text-text-secondary">{target.name}</p>
      </Modal.Header>
      <Modal.Body>
        <form id="stock-form" className="flex flex-col gap-4 p-0.5" onSubmit={submit} noValidate>
          <ToggleButtonGroup
            size="sm"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[mode]}
            onSelectionChange={(keys) => {
              const [next] = [...keys];
              if (next === 'in' || next === 'out' || next === 'count') {
                setMode(next);
                setQuantity(next === 'count' ? String(target.stock) : '1');
              }
            }}
            aria-label="Tipo de cambio"
            className="w-full"
          >
            {MODES.map((item) => (
              <ToggleButton key={item.id} id={item.id} className="flex-1 text-[12.5px]">
                {item.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <p className="panel-meta -mt-2">{MODES.find((item) => item.id === mode)?.hint}</p>

          <div className="flex items-end gap-2">
            <Button
              isIconOnly
              size="md"
              variant="tertiary"
              aria-label="Una menos"
              isDisabled={!isValid || amount <= 0}
              onPress={() => setQuantity(String(amount - 1))}
            >
              <IconMinus />
            </Button>
            <TextField
              type="number"
              value={quantity}
              onChange={setQuantity}
              className="flex-1"
              autoFocus
            >
              <Label>{mode === 'count' ? 'Unidades contadas' : 'Cantidad'}</Label>
              <Input min={0} step={1} className="panel-num text-center" />
            </TextField>
            <Button
              isIconOnly
              size="md"
              variant="tertiary"
              aria-label="Una más"
              isDisabled={!isValid}
              onPress={() => setQuantity(String(amount + 1))}
            >
              <IconPlus />
            </Button>
          </div>

          <TextField value={note} onChange={setNote}>
            <Label>Nota (opcional)</Label>
            <Input maxLength={300} placeholder="Lote de noviembre, pieza rota…" />
            <Description>Queda en el historial de inventario.</Description>
          </TextField>

          <div className="flex items-center justify-between rounded-md bg-bg px-3 py-2.5 text-[13px]">
            <span className="text-text-secondary">
              Ahora <span className="panel-num font-medium text-text">{target.stock}</span>
            </span>
            <span className={after < 0 ? 'font-medium text-danger' : 'text-text-secondary'}>
              {after < 0 ? (
                `Solo hay ${target.stock} unidades`
              ) : (
                <>
                  Quedarán <span className="panel-num font-medium text-text">{after}</span>
                </>
              )}
            </span>
          </div>
          <ErrorNotice error={save.error} title="No se pudo cambiar el stock" />
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="tertiary" onPress={onClose}>
          Cancelar
        </Button>
        <Button
          size="sm"
          variant="primary"
          isPending={save.isPending}
          isDisabled={delta === 0 || after < 0}
          onPress={() => submit()}
        >
          Guardar
        </Button>
      </Modal.Footer>
    </>
  );
}
