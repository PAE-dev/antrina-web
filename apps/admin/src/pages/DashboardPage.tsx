import { Button, Skeleton } from '@heroui/react';
import { ADMIN_SALES_ROUTES, type DailyRevenueDto, type DashboardDto } from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconAlert, IconPlus, IconReceipt } from '../components/icons';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { EmptyState, PageHeader, StatCard } from '../components/PageKit';
import { api } from '../lib/api';
import { formatDayKey, formatShortDate } from '../lib/format';

function monthHint(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? 'Sin ventas el mes pasado' : 'Aún sin ventas';
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change >= 0 ? '+' : ''}${change}% respecto al mes pasado`;
}

/** Ingresos por día: una sola serie, así que el título la nombra y no hace falta leyenda. */
function RevenueChart({ days }: { days: DailyRevenueDto[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...days.map((day) => day.revenue.amount), 1);
  const active = hovered === null ? null : days[hovered];
  const first = days[0];
  const last = days.at(-1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-5 items-center justify-end text-[12.5px]" aria-live="polite">
        {active ? (
          <span className="text-text-secondary">
            {formatDayKey(active.day)} ·{' '}
            <span className="panel-num font-medium text-text">
              {formatMoney(active.revenue, 'es')}
            </span>{' '}
            · {active.orderCount} {active.orderCount === 1 ? 'venta' : 'ventas'}
          </span>
        ) : (
          <span className="text-text-muted">Pasa el cursor sobre un día</span>
        )}
      </div>
      <div
        role="img"
        aria-label={`Ingresos de los últimos ${days.length} días`}
        className="flex h-40 items-end gap-0.5 border-b border-border"
        onMouseLeave={() => setHovered(null)}
      >
        {days.map((day, index) => (
          <div
            key={day.day}
            className="flex h-full min-w-0 flex-1 items-end"
            onMouseEnter={() => setHovered(index)}
          >
            {day.revenue.amount > 0 && (
              <div
                className={`w-full rounded-t-[4px] transition-colors ${hovered === index ? 'bg-brand' : 'bg-brand/75'}`}
                style={{ height: `${Math.max((day.revenue.amount / max) * 100, 2)}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="panel-meta flex justify-between">
        <span>{first ? formatDayKey(first.day) : ''}</span>
        <span>Hoy{last ? `, ${formatDayKey(last.day)}` : ''}</span>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel-card flex flex-col overflow-hidden">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="panel-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const PANEL_LINK = 'text-[12.5px] font-medium text-text-secondary hover:text-text hover:underline';

export function DashboardPage() {
  const navigate = useNavigate();
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api<DashboardDto>('GET', ADMIN_SALES_ROUTES.dashboard),
  });
  const data = dashboard.data;

  const header = (
    <PageHeader
      title="Resumen"
      description="Cómo va el negocio hoy y este mes."
      actions={
        <>
          <Button variant="tertiary" onPress={() => void navigate('/productos/nuevo')}>
            <IconPlus />
            Producto
          </Button>
          <Button variant="primary" onPress={() => void navigate('/ventas/nueva')}>
            <IconPlus />
            Registrar venta
          </Button>
        </>
      }
    />
  );

  if (dashboard.error) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorNotice error={dashboard.error} title="No se pudo cargar el resumen" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-md" />
      </div>
    );
  }

  const averageTicket =
    data.month.orderCount > 0
      ? {
          ...data.month.revenue,
          amount: Math.round(data.month.revenue.amount / data.month.orderCount),
        }
      : null;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={formatMoney(data.today.revenue, 'es')}
          hint={`${data.today.orderCount} ${data.today.orderCount === 1 ? 'venta' : 'ventas'} · ${data.today.unitCount} und.`}
        />
        <StatCard
          label="Ventas del mes"
          value={formatMoney(data.month.revenue, 'es')}
          hint={monthHint(data.month.revenue.amount, data.previousMonth.revenue.amount)}
        />
        <StatCard
          label="Compras del mes"
          value={String(data.month.orderCount)}
          hint={
            averageTicket
              ? `Ticket promedio ${formatMoney(averageTicket, 'es')}`
              : `${data.month.unitCount} unidades`
          }
        />
        <StatCard
          label="Por cobrar"
          value={String(data.pendingOrderCount)}
          hint={
            data.pendingOrderCount === 1 ? 'venta pendiente de pago' : 'ventas pendientes de pago'
          }
          tone={data.pendingOrderCount > 0 ? 'warning' : undefined}
        />
      </div>

      <Panel title="Ingresos de los últimos 30 días">
        <div className="p-4">
          <RevenueChart days={data.last30Days} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Últimas ventas"
          action={
            <Link to="/ventas" className={PANEL_LINK}>
              Ver todas
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState
              icon={<IconReceipt size={18} />}
              title="Todavía no hay ventas"
              description="Registra la primera y aquí verás tus números."
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/ventas/${order.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13.5px] font-medium text-text">
                        #{order.number} · {order.customer?.name ?? 'Sin cliente'}
                      </span>
                      <span className="panel-meta truncate">
                        {formatShortDate(order.soldAt)} · {order.unitCount} und.
                      </span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    <span className="panel-num w-20 shrink-0 text-right text-[13.5px] font-medium text-text">
                      {formatMoney(order.total, 'es')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel
            title="Stock por reponer"
            action={
              <Link to="/inventario" className={PANEL_LINK}>
                Ver inventario
              </Link>
            }
          >
            {data.stockAlerts.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-text-muted">
                Todo tu stock está por encima de la alerta.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.stockAlerts.map((alert) => (
                  <li key={alert.productId}>
                    <Link
                      to={`/productos/${alert.productId}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg"
                    >
                      <span className={alert.stock === 0 ? 'text-danger' : 'text-warning'}>
                        <IconAlert size={15} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                        {alert.name}
                      </span>
                      <span
                        className={`panel-num text-[13px] font-medium ${alert.stock === 0 ? 'text-danger' : 'text-warning'}`}
                      >
                        {alert.stock === 0 ? 'Agotado' : `Quedan ${alert.stock}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Más vendidos del mes">
            {data.topProducts.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-text-muted">
                Aparecerán cuando registres ventas este mes.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.topProducts.map((product) => (
                  <li key={product.productId} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                      {product.name}
                    </span>
                    <span className="panel-num text-[13px] text-text-muted">
                      {product.unitCount} und.
                    </span>
                    <span className="panel-num w-20 text-right text-[13.5px] font-medium text-text">
                      {formatMoney(product.revenue, 'es')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
