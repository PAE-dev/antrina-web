import { Button, SearchField, Skeleton, Tabs } from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  ADMIN_SALES_ROUTES,
  type AdminProductListItemDto,
  type AdminProductListResponse,
  type DashboardDto,
  type StockMovementListResponse,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconLayers, IconPlus } from '../components/icons';
import { EmptyState, PageHeader, Pagination, StatCard, TH } from '../components/PageKit';
import { StockDialog, type StockTarget } from '../components/StockDialog';
import { api } from '../lib/api';
import { formatDate, MOVEMENT_LABELS } from '../lib/format';

const PAGE_SIZE = 20;
type View = 'stock' | 'movements';
type StockFilter = 'ALL' | 'low' | 'out';

const STOCK_FILTERS: { id: StockFilter; label: string }[] = [
  { id: 'ALL', label: 'Todo' },
  { id: 'low', label: 'Stock bajo' },
  { id: 'out', label: 'Agotados' },
];

export function StockLevel({ product }: { product: AdminProductListItemDto }) {
  if (product.stock === 0) return <span className="font-medium text-danger">Agotado</span>;
  if (product.isLowStock) return <span className="font-medium text-warning">{product.stock}</span>;
  return <span className="text-text">{product.stock}</span>;
}

function StockView({ onChange }: { onChange: (target: StockTarget) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('ALL');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (query.trim()) params.set('q', query.trim());
  if (filter !== 'ALL') params.set('stock', filter);

  const products = useQuery({
    queryKey: ['admin', 'products', 'inventory', { query: query.trim(), filter, page }],
    queryFn: () =>
      api<AdminProductListResponse>('GET', `${ADMIN_CATALOG_ROUTES.products}?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const rows = products.data?.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          selectedKey={filter}
          onSelectionChange={(key) => {
            setFilter(key as StockFilter);
            setPage(1);
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
            setPage(1);
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
      {products.error ? (
        <div className="p-4">
          <ErrorNotice error={products.error} title="No se pudo cargar el inventario" />
        </div>
      ) : products.isPending ? (
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconLayers size={18} />}
          title={filter === 'ALL' && !query ? 'Todavía no hay productos' : 'Nada por aquí'}
          description={
            filter === 'ALL' && !query
              ? 'Crea un producto para empezar a llevar su stock.'
              : 'No hay productos con este filtro.'
          }
        />
      ) : (
        <ul className={`divide-y divide-border ${products.isPlaceholderData ? 'opacity-60' : ''}`}>
          {rows.map((product) => (
            <li key={product.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  to={`/productos/${product.id}`}
                  className="truncate text-[13.5px] font-medium text-text hover:underline"
                >
                  {product.name}
                </Link>
                <span className="truncate font-mono text-[12px] text-text-muted">
                  {product.sku}
                  <span className="font-sans"> · alerta en {product.lowStockThreshold}</span>
                </span>
              </div>
              <span className="panel-num w-16 text-right text-[15px]">
                <StockLevel product={product} />
              </span>
              <Button
                size="sm"
                variant="tertiary"
                onPress={() =>
                  onChange({ id: product.id, name: product.name, stock: product.stock })
                }
              >
                <IconPlus size={14} />
                <span className="hidden sm:inline">Cambiar stock</span>
                <span className="sr-only sm:hidden">Cambiar stock</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={products.data?.total ?? 0}
        onPageChange={setPage}
      />
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
        description="Cuánto tienes de cada producto. Cada entrada, salida y venta queda registrada."
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
