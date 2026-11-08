import { Skeleton } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  type InventoryGroupDto,
  type InventoryItemDto,
  type InventoryResponse,
} from '@antrina/contracts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconQr } from '../components/icons';
import { Choice, EmptyState, PageHeader } from '../components/PageKit';
import { PiecesPanel } from '../components/PiecesPanel';
import { api } from '../lib/api';

const productsOf = (group: InventoryGroupDto): InventoryItemDto[] => [
  ...group.items,
  ...group.children.flatMap(productsOf),
];

/** Elegir producto, escribir la cantidad y descargar: todo en una sola pantalla. */
export function QrCodesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inventory = useQuery({
    queryKey: ['admin', 'products', 'inventory', 'qr'],
    queryFn: () => api<InventoryResponse>('GET', ADMIN_CATALOG_ROUTES.inventory),
  });
  const products = (inventory.data?.groups ?? [])
    .flatMap(productsOf)
    .filter((product) => product.status !== 'ARCHIVED');
  const selected =
    products.find((product) => product.id === selectedId) ??
    (products.length === 1 ? products[0] : undefined);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Códigos QR"
        description="Elige el producto, escribe cuántos necesitas y descárgalos. Nunca se repiten."
      />

      <div className="panel-card flex flex-col gap-5 p-4 sm:p-5">
        {inventory.error ? (
          <ErrorNotice error={inventory.error} title="No se pudieron cargar los productos" />
        ) : inventory.isPending ? (
          <Skeleton className="h-16 w-full rounded-md" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<IconQr size={18} />}
            title="Todavía no hay productos"
            description="Crea el producto primero; después podrás generar sus códigos aquí."
            action={
              <Link to="/productos/nuevo" className="text-[13.5px] font-medium underline">
                Crear producto
              </Link>
            }
          />
        ) : (
          <>
            <Choice
              label="Producto"
              placeholder="Elige un producto"
              value={selected?.id ?? null}
              onChange={setSelectedId}
              className="max-w-md"
              options={products.map((product) => ({
                id: product.id,
                label: `${product.name} · ${product.sku}`,
              }))}
            />
            {selected && (
              <PiecesPanel
                key={selected.id}
                productId={selected.id}
                sku={selected.sku}
                name={selected.name}
                stock={selected.stock}
                isArchived={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
