import { Button, Checkbox, SearchField, Skeleton, Tabs, toast } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  ADMIN_SALES_ROUTES,
  type ClearStockRequest,
  type ClearStockResponse,
  type DashboardDto,
  type InventoryGroupDto,
  type InventoryItemDto,
  type InventoryResponse,
  type StockMovementListResponse,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconChevronRight, IconLayers, IconMinus, IconPlus } from '../components/icons';
import { EmptyState, PageHeader, Pagination, StatCard, TH } from '../components/PageKit';
import { StatusBadge } from '../components/StatusBadge';
import { invalidateStock, StockDialog, type StockTarget } from '../components/StockDialog';
import { api } from '../lib/api';
import { formatDate, MOVEMENT_LABELS } from '../lib/format';

const PAGE_SIZE = 20;
const CLEAR_NOTE = 'Limpieza de inventario';
type View = 'stock' | 'movements';
type StockFilter = 'ALL' | 'low' | 'out';
type BulkAction = 'clear' | 'archive';

const STOCK_FILTERS: { id: StockFilter; label: string }[] = [
  { id: 'ALL', label: 'Todo' },
  { id: 'low', label: 'Stock bajo' },
  { id: 'out', label: 'Agotados' },
];

function StockLevel({ item }: { item: InventoryItemDto }) {
  if (item.stock === 0) return <span className="font-medium text-danger">Agotado</span>;
  if (item.isLowStock) return <span className="font-medium text-warning">{item.stock}</span>;
  return <span className="text-text">{item.stock}</span>;
}

/** Productos de una categoría, incluidas sus subcategorías. */
function groupItems(group: InventoryGroupDto): InventoryItemDto[] {
  return [...group.items, ...group.children.flatMap(groupItems)];
}

const countLabel = (count: number) => `${count} ${count === 1 ? 'producto' : 'productos'}`;
const unitsLabel = (units: number) => `${units} ${units === 1 ? 'unidad' : 'unidades'}`;

function SelectBox({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: InventoryItemDto[];
  selected: ReadonlySet<string>;
  onChange: (ids: string[], isSelected: boolean) => void;
}) {
  const count = items.filter((item) => selected.has(item.id)).length;
  return (
    <Checkbox
      aria-label={label}
      isSelected={count > 0 && count === items.length}
      isIndeterminate={count > 0 && count < items.length}
      onChange={(value) =>
        onChange(
          items.map((item) => item.id),
          value,
        )
      }
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

function ProductRow({
  item,
  selected,
  onSelect,
  onChange,
  isNested,
}: {
  item: InventoryItemDto;
  selected: ReadonlySet<string>;
  onSelect: (ids: string[], isSelected: boolean) => void;
  onChange: (target: StockTarget) => void;
  isNested: boolean;
}) {
  const target = { id: item.id, name: item.name, stock: item.stock };
  return (
    <li
      className={`flex items-center gap-3 py-2 pr-3 ${isNested ? 'pl-4 sm:pl-14' : 'pl-4 sm:pl-9'}`}
    >
      <SelectBox
        label={`Seleccionar ${item.name}`}
        items={[item]}
        selected={selected}
        onChange={onSelect}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/productos/${item.id}`}
          className="truncate text-[13.5px] font-medium text-text hover:underline"
        >
          {item.name}
        </Link>
        <span className="truncate font-mono text-[12px] text-text-muted">
          {item.sku}
          <span className="font-sans"> · alerta en {item.lowStockThreshold}</span>
        </span>
      </div>
      {item.status === 'DRAFT' && (
        <span className="hidden sm:inline-flex">
          <StatusBadge status={item.status} />
        </span>
      )}
      <span className="panel-num w-14 text-right text-[15px]">
        <StockLevel item={item} />
      </span>
      <div className="flex items-center gap-1">
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label={`Sacar unidades de ${item.name}`}
          isDisabled={item.stock === 0}
          onPress={() => onChange({ ...target, mode: 'out' })}
        >
          <IconMinus size={14} />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label={`Agregar unidades a ${item.name}`}
          onPress={() => onChange({ ...target, mode: 'in' })}
        >
          <IconPlus size={14} />
        </Button>
      </div>
    </li>
  );
}

function CategoryBlock({
  group,
  selected,
  onSelect,
  onChange,
  isChild = false,
}: {
  group: InventoryGroupDto;
  selected: ReadonlySet<string>;
  onSelect: (ids: string[], isSelected: boolean) => void;
  onChange: (target: StockTarget) => void;
  isChild?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const items = groupItems(group);
  return (
    <section className={isChild ? 'border-t border-border' : ''}>
      <div
        className={`flex items-center gap-3 py-2 pr-4 ${isChild ? 'pl-4 sm:pl-9' : 'bg-bg pl-4'}`}
      >
        <SelectBox
          label={`Seleccionar ${group.name}`}
          items={items}
          selected={selected}
          onChange={onSelect}
        />
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <IconChevronRight
            size={14}
            className={`shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
          <span
            className={`truncate ${isChild ? 'text-[13px] font-medium text-text-secondary' : 'panel-heading'}`}
          >
            {group.name}
          </span>
        </button>
        <span className="panel-num whitespace-nowrap text-[12.5px] text-text-muted">
          <span className="hidden sm:inline">{countLabel(items.length)} · </span>
          {unitsLabel(group.units)}
        </span>
      </div>
      {isOpen && (
        <>
          {group.items.length > 0 && (
            <ul className="divide-y divide-border border-t border-border">
              {group.items.map((item) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  selected={selected}
                  onSelect={onSelect}
                  onChange={onChange}
                  isNested={isChild}
                />
              ))}
            </ul>
          )}
          {group.children.map((child) => (
            <CategoryBlock
              key={child.categoryId}
              group={child}
              selected={selected}
              onSelect={onSelect}
              onChange={onChange}
              isChild
            />
          ))}
        </>
      )}
    </section>
  );
}

function StockView({ onChange }: { onChange: (target: StockTarget) => void }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('ALL');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);

  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (filter !== 'ALL') params.set('stock', filter);

  const inventory = useQuery({
    queryKey: ['admin', 'products', 'inventory', { query: query.trim(), filter }],
    queryFn: () =>
      api<InventoryResponse>('GET', `${ADMIN_CATALOG_ROUTES.inventory}?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const groups = inventory.data?.groups ?? [];
  const items = groups.flatMap(groupItems);
  const selectedItems = items.filter((item) => selected.has(item.id));
  const selectedUnits = selectedItems.reduce((sum, item) => sum + item.stock, 0);

  const select = (ids: string[], isSelected: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (isSelected) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const finish = () => {
    setBulkAction(null);
    setSelected(new Set());
    invalidateStock(queryClient);
  };

  const clear = useMutation({
    mutationFn: () => {
      const body: ClearStockRequest = {
        productIds: selectedItems.map((item) => item.id),
        note: CLEAR_NOTE,
      };
      return api<ClearStockResponse>('POST', ADMIN_CATALOG_ROUTES.inventoryClear, body);
    },
    onSuccess: (result) => {
      finish();
      toast.success(`Se retiraron ${unitsLabel(result.units)}`, {
        description: `${countLabel(result.cleared)} en cero. Queda en el historial.`,
      });
    },
    onSettled: () => setBulkAction(null),
  });

  const archive = useMutation({
    mutationFn: async () => {
      for (const item of selectedItems) {
        await api('POST', ADMIN_CATALOG_ROUTES.archiveProduct(item.id));
      }
    },
    onSuccess: () => {
      const count = selectedItems.length;
      finish();
      toast.success(`${countLabel(count)} archivados`, {
        description: 'Ya no aparecen en la tienda ni en el inventario.',
      });
    },
    onError: () => invalidateStock(queryClient),
    onSettled: () => setBulkAction(null),
  });

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          selectedKey={filter}
          onSelectionChange={(key) => {
            setFilter(key as StockFilter);
            setSelected(new Set());
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Filtrar por existencias">
              {STOCK_FILTERS.map((item) => (
                <Tabs.Tab key={item.id} id={item.id} className="whitespace-nowrap px-3 text-[13px]">
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
        <SearchField
          aria-label="Buscar por nombre o SKU"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setSelected(new Set());
          }}
          className="md:w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar por nombre o SKU" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>
      {inventory.error ? (
        <div className="p-4">
          <ErrorNotice error={inventory.error} title="No se pudo cargar el inventario" />
        </div>
      ) : inventory.isPending ? (
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<IconLayers size={18} />}
          title={filter === 'ALL' && !query ? 'Todavía no hay productos' : 'Nada por aquí'}
          description={
            filter === 'ALL' && !query
              ? 'Crea un producto y aparecerá aquí, dentro de su categoría.'
              : 'No hay productos con este filtro.'
          }
        />
      ) : (
        <>
          <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-2 pl-4 pr-3">
            <SelectBox
              label="Seleccionar todos los productos"
              items={items}
              selected={selected}
              onChange={select}
            />
            <span className="panel-num flex-1 whitespace-nowrap text-[13px] text-text-secondary">
              {selectedItems.length > 0
                ? `${selectedItems.length} de ${items.length} · ${unitsLabel(selectedUnits)}`
                : `Seleccionar todo (${items.length})`}
            </span>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="tertiary"
                  isDisabled={selectedUnits === 0}
                  onPress={() => setBulkAction('clear')}
                >
                  Dejar en 0
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onPress={() => setBulkAction('archive')}
                >
                  Archivar
                </Button>
              </div>
            )}
          </div>
          <ErrorNotice error={clear.error} title="No se pudo dejar en cero" />
          <ErrorNotice error={archive.error} title="No se pudieron archivar todos" />
          <div
            className={`divide-y divide-border ${inventory.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {groups.map((group) => (
              <CategoryBlock
                key={group.categoryId}
                group={group}
                selected={selected}
                onSelect={select}
                onChange={onChange}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={bulkAction === 'clear'}
        onOpenChange={(open) => !open && setBulkAction(null)}
        title={`¿Retirar ${unitsLabel(selectedUnits)}?`}
        confirmLabel="Dejar en 0"
        tone="warning"
        isPending={clear.isPending}
        onConfirm={() => clear.mutate()}
      >
        Los productos elegidos quedarán en 0 y, si están publicados, la tienda los mostrará
        agotados. El cambio queda en el historial.
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={bulkAction === 'archive'}
        onOpenChange={(open) => !open && setBulkAction(null)}
        title={`¿Archivar ${countLabel(selectedItems.length)}?`}
        confirmLabel="Archivar"
        isPending={archive.isPending}
        onConfirm={() => archive.mutate()}
      >
        Dejarán de mostrarse en la tienda y de contar en el inventario. No se borran: puedes volver
        a publicarlos desde Productos.
      </ConfirmDialog>
    </>
  );
}

function MovementsView() {
  const [page, setPage] = useState(1);
  const movements = useQuery({
    queryKey: ['admin', 'stock-movements', { page }],
    queryFn: () =>
      api<StockMovementListResponse>(
        'GET',
        `${ADMIN_CATALOG_ROUTES.stockMovements}?page=${page}&pageSize=${PAGE_SIZE}`,
      ),
    placeholderData: keepPreviousData,
  });
  const rows = movements.data?.data ?? [];

  if (movements.error) {
    return (
      <div className="p-4">
        <ErrorNotice error={movements.error} title="No se pudo cargar el historial" />
      </div>
    );
  }
  return (
    <>
      {movements.isPending ? (
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-bg">
              <tr className="border-b border-border">
                <th scope="col" className={TH}>
                  Fecha
                </th>
                <th scope="col" className={TH}>
                  Producto
                </th>
                <th scope="col" className={TH}>
                  Motivo
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Cambio
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Quedó en
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((movement) => (
                <tr key={movement.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-text-muted">
                    {formatDate(movement.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-text">
                        {movement.productName}
                      </span>
                      <span className="font-mono text-[12px] text-text-muted">
                        {movement.productSku}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-text-secondary">
                    {MOVEMENT_LABELS[movement.type]}
                    {movement.orderId && movement.orderNumber && (
                      <>
                        {' '}
                        <Link to={`/ventas/${movement.orderId}`} className="hover:underline">
                          #{movement.orderNumber}
                        </Link>
                      </>
                    )}
                    {movement.note && (
                      <span className="block text-[12.5px] text-text-muted">{movement.note}</span>
                    )}
                    {movement.adminName && (
                      <span className="block text-[12px] text-text-muted">
                        {movement.adminName}
                      </span>
                    )}
                  </td>
                  <td
                    className={`panel-num px-4 py-2.5 text-right text-[13.5px] font-medium ${movement.quantity < 0 ? 'text-danger' : 'text-success'}`}
                  >
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </td>
                  <td className="panel-num px-4 py-2.5 text-right text-[13.5px] text-text">
                    {movement.stockAfter}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={movements.data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}

export function InventoryPage() {
  const [view, setView] = useState<View>('stock');
  const [target, setTarget] = useState<StockTarget | null>(null);
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api<DashboardDto>('GET', ADMIN_SALES_ROUTES.dashboard),
  });
  const inventory = dashboard.data?.inventory;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Cuánto tienes de cada producto, por categoría. Cada entrada, salida y venta queda registrada."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Unidades en stock"
          value={inventory ? String(inventory.unitsInStock) : '–'}
        />
        <StatCard
          label="Stock bajo"
          value={inventory ? String(inventory.lowStockCount) : '–'}
          tone={inventory && inventory.lowStockCount > 0 ? 'warning' : undefined}
        />
        <StatCard
          label="Agotados"
          value={inventory ? String(inventory.outOfStockCount) : '–'}
          tone={inventory && inventory.outOfStockCount > 0 ? 'danger' : undefined}
        />
        <StatCard
          label="Valor al costo"
          value={inventory ? formatMoney(inventory.stockCost, 'es') : '–'}
          hint="Solo productos con costo"
        />
      </div>

      <div className="panel-card overflow-hidden">
        <div className="border-b border-border px-3 pt-2">
          <Tabs
            variant="secondary"
            selectedKey={view}
            onSelectionChange={(key) => setView(key as View)}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Vista de inventario" className="w-max gap-1">
                <Tabs.Tab id="stock" className="w-auto px-3 text-[13px]">
                  Existencias
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="movements" className="w-auto px-3 text-[13px]">
                  Historial
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>
        {view === 'stock' ? <StockView onChange={setTarget} /> : <MovementsView />}
      </div>

      <StockDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
