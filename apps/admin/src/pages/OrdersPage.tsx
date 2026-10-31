import { Button, SearchField, Skeleton, Tabs } from '@heroui/react';
import {
  ADMIN_SALES_ROUTES,
  type OrderChannelCode,
  type OrderDto,
  type OrderListResponse,
  type OrderStatusCode,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconPlus, IconReceipt } from '../components/icons';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { Choice, EmptyState, PageHeader, Pagination, TH } from '../components/PageKit';
import { api } from '../lib/api';
import { CHANNEL_LABELS, formatShortDate, PAYMENT_LABELS } from '../lib/format';

const PAGE_SIZE = 20;
type StatusFilter = OrderStatusCode | 'ALL';
type ChannelFilter = OrderChannelCode | 'ALL';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'PENDING', label: 'Por cobrar' },
  { id: 'PAID', label: 'Pagadas' },
  { id: 'SHIPPED', label: 'Enviadas' },
  { id: 'DELIVERED', label: 'Entregadas' },
  { id: 'CANCELLED', label: 'Canceladas' },
];

const summarize = (order: OrderDto) => {
  const [first, ...rest] = order.lines;
  if (!first) return '';
  const name = first.quantity > 1 ? `${first.quantity} × ${first.name}` : first.name;
  return rest.length > 0 ? `${name} y ${rest.length} más` : name;
};

export function OrdersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [channel, setChannel] = useState<ChannelFilter>('ALL');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (query.trim()) params.set('q', query.trim());
  if (status !== 'ALL') params.set('status', status);
  if (channel !== 'ALL') params.set('channel', channel);

  const orders = useQuery({
    queryKey: ['admin', 'orders', { query: query.trim(), status, channel, page }],
    queryFn: () =>
      api<OrderListResponse>('GET', `${ADMIN_SALES_ROUTES.orders}?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  const rows = orders.data?.data ?? [];
  const isFiltered = Boolean(query.trim()) || status !== 'ALL' || channel !== 'ALL';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description="Todas tus compras en un lugar. Al registrar una venta el stock se descuenta solo."
        actions={
          <Button variant="primary" onPress={() => void navigate('/ventas/nueva')}>
            <IconPlus />
            Registrar venta
          </Button>
        }
      />

      <div className="panel-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="overflow-x-auto">
            <Tabs
              selectedKey={status}
              onSelectionChange={(key) => {
                setStatus(key as StatusFilter);
                setPage(1);
              }}
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="Filtrar por estado">
                  {FILTERS.map((filter) => (
                    <Tabs.Tab
                      key={filter.id}
                      id={filter.id}
                      className="whitespace-nowrap px-3 text-[13px]"
                    >
                      {filter.label}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchField
              aria-label="Buscar venta"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              className="flex-1"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Número, cliente, teléfono o producto" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Choice
              ariaLabel="Filtrar por canal"
              value={channel}
              className="sm:w-48"
              onChange={(value) => {
                setChannel(value as ChannelFilter);
                setPage(1);
              }}
              options={[
                { id: 'ALL', label: 'Todos los canales' },
                ...(Object.keys(CHANNEL_LABELS) as OrderChannelCode[]).map((code) => ({
                  id: code,
                  label: CHANNEL_LABELS[code],
                })),
              ]}
            />
          </div>
        </div>

        {orders.error ? (
          <div className="p-4">
            <ErrorNotice error={orders.error} title="No se pudieron cargar las ventas" />
          </div>
        ) : orders.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconReceipt size={18} />}
            title={isFiltered ? 'Sin resultados' : 'Todavía no hay ventas'}
            description={
              isFiltered
                ? 'Prueba con otro filtro o búsqueda.'
                : 'Registra tu primera venta: toma menos de un minuto.'
            }
          />
        ) : (
          <>
            <ul
              className={`divide-y divide-border md:hidden ${orders.isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {rows.map((order) => (
                <li key={order.id}>
                  <Link to={`/ventas/${order.id}`} className="flex flex-col gap-1.5 px-4 py-3">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13.5px] font-medium text-text">
                        #{order.number} · {order.customer?.name ?? 'Sin cliente'}
                      </span>
                      <span className="panel-num text-[13.5px] font-medium text-text">
                        {formatMoney(order.total, 'es')}
                      </span>
                    </span>
                    <span className="panel-meta truncate">{summarize(order)}</span>
                    <span className="flex items-center justify-between gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="panel-meta">
                        {CHANNEL_LABELS[order.channel]} · {formatShortDate(order.soldAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead className="bg-bg">
                  <tr className="border-b border-border">
                    <th scope="col" className={TH}>
                      Venta
                    </th>
                    <th scope="col" className={TH}>
                      Cliente
                    </th>
                    <th scope="col" className={TH}>
                      Canal y pago
                    </th>
                    <th scope="col" className={TH}>
                      Estado
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-border ${orders.isPlaceholderData ? 'opacity-60' : ''}`}
                >
                  {rows.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => void navigate(`/ventas/${order.id}`)}
                      className="cursor-pointer transition-colors hover:bg-bg"
                    >
                      <td className="max-w-[320px] px-4 py-2.5">
                        <div className="flex flex-col">
                          <Link
                            to={`/ventas/${order.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="truncate text-[13.5px] font-medium text-text hover:underline"
                          >
                            #{order.number} · {summarize(order)}
                          </Link>
                          <span className="panel-meta">{formatShortDate(order.soldAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-text-secondary">
                        {order.customer?.name ?? (
                          <span className="text-text-muted">Sin cliente</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-text-secondary">
                        {CHANNEL_LABELS[order.channel]}
                        {order.paymentMethod && (
                          <span className="text-text-muted">
                            {' · '}
                            {PAYMENT_LABELS[order.paymentMethod]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td
                        className={`panel-num whitespace-nowrap px-4 py-2.5 text-right text-[13.5px] font-medium ${order.status === 'CANCELLED' ? 'text-text-muted line-through' : 'text-text'}`}
                      >
                        {formatMoney(order.total, 'es')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={orders.data?.total ?? 0}
          onPageChange={setPage}
        />
      </div>

      <Outlet />
    </div>
  );
}
