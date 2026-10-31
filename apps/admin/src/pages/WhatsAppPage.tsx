import {
  Button,
  buttonVariants,
  Label,
  SearchField,
  Skeleton,
  TextArea,
  TextField,
} from '@heroui/react';
import {
  ADMIN_SALES_ROUTES,
  type CustomerDto,
  type CustomerListResponse,
  type OrderDto,
  type OrderListResponse,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconChat, IconExternal, IconPlus } from '../components/icons';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { EmptyState, PageHeader } from '../components/PageKit';
import { api } from '../lib/api';
import { formatPhone, formatShortDate, initials, whatsappUrl } from '../lib/format';

interface Template {
  id: string;
  label: string;
  build: (customer: CustomerDto, order: OrderDto | undefined) => string;
}

const firstName = (customer: CustomerDto) => customer.name.split(/\s+/)[0] ?? customer.name;

const TEMPLATES: Template[] = [
  {
    id: 'hello',
    label: 'Saludo',
    build: (customer) => `Hola ${firstName(customer)}, te escribimos de Antrina.`,
  },
  {
    id: 'thanks',
    label: 'Gracias por tu compra',
    build: (customer, order) =>
      `Hola ${firstName(customer)}, gracias por tu compra${order ? ` #${order.number}` : ''} en Antrina. Cualquier duda, escríbenos por aquí.`,
  },
  {
    id: 'payment',
    label: 'Recordar pago',
    build: (customer, order) =>
      `Hola ${firstName(customer)}, te recordamos que tu pedido${order ? ` #${order.number} por ${formatMoney(order.total, 'es')}` : ''} está pendiente de pago. ¿Te ayudamos con algo?`,
  },
  {
    id: 'shipped',
    label: 'Pedido enviado',
    build: (customer, order) =>
      `Hola ${firstName(customer)}, tu pedido${order ? ` #${order.number}` : ''} ya está en camino. Gracias por confiar en Antrina.`,
  },
];

function ConversationPane({ customer }: { customer: CustomerDto }) {
  const [message, setMessage] = useState(() => TEMPLATES[0]?.build(customer, undefined) ?? '');
  const orders = useQuery({
    queryKey: ['admin', 'orders', 'customer', customer.id, 'whatsapp'],
    queryFn: () =>
      api<OrderListResponse>(
        'GET',
        `${ADMIN_SALES_ROUTES.orders}?customerId=${customer.id}&pageSize=5`,
      ),
  });
  const lastOrder = orders.data?.data[0];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <Link
            to={`/clientes/${customer.id}`}
            className="truncate text-[13.5px] font-medium text-text hover:underline"
          >
            {customer.name}
          </Link>
          <span className="panel-meta truncate">{formatPhone(customer.phone ?? '')}</span>
        </div>
        <span className="panel-meta panel-num shrink-0 text-right">
          {customer.orderCount} {customer.orderCount === 1 ? 'compra' : 'compras'} ·{' '}
          {formatMoney(customer.totalSpent, 'es')}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-4">
        <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border-strong px-4 py-8 text-center">
          <p className="panel-heading">La conversación se verá aquí</p>
          <p className="max-w-sm text-[13px] text-text-muted">
            Cuando conectemos tu número, aquí aparecerán los mensajes. Por ahora, envía desde
            WhatsApp con el botón de abajo.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="panel-heading">Últimas compras</h3>
          {orders.error ? (
            <ErrorNotice error={orders.error} title="No se pudieron cargar las compras" />
          ) : orders.isPending ? (
            <Skeleton className="h-9 w-full rounded-md" />
          ) : (orders.data?.data.length ?? 0) === 0 ? (
            <p className="text-[13px] text-text-muted">Todavía no ha comprado.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {orders.data?.data.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/ventas/${order.id}`}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-bg"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                      #{order.number} · {formatShortDate(order.soldAt)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                    <span className="panel-num text-[13px] font-medium text-text">
                      {formatMoney(order.total, 'es')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((template) => (
              <Button
                key={template.id}
                size="sm"
                variant="tertiary"
                onPress={() => setMessage(template.build(customer, lastOrder))}
              >
                {template.label}
              </Button>
            ))}
          </div>
          <TextField value={message} onChange={setMessage}>
            <Label>Mensaje</Label>
            <TextArea rows={3} maxLength={1000} />
          </TextField>
          <a
            href={whatsappUrl(customer.phone ?? '', message)}
            target="_blank"
            rel="noreferrer"
            className={`${buttonVariants({ variant: 'primary', size: 'sm' })} self-end`}
          >
            Abrir en WhatsApp
            <IconExternal size={15} />
          </a>
        </section>
      </div>
    </div>
  );
}

/**
 * Bandeja preparada para el CRM de WhatsApp. Sin datos inventados: la lista son clientes reales y el
 * envío abre wa.me hasta que se conecte la API de WhatsApp Cloud.
 */
export function WhatsAppPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = new URLSearchParams({ withPhone: 'true', pageSize: '50' });
  if (query.trim()) params.set('q', query.trim());

  const customers = useQuery({
    queryKey: ['admin', 'customers', 'whatsapp', query.trim()],
    queryFn: () =>
      api<CustomerListResponse>('GET', `${ADMIN_SALES_ROUTES.customers}?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const rows = customers.data?.data ?? [];
  const selected = rows.find((customer) => customer.id === selectedId) ?? rows[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="WhatsApp"
        description="Tus clientes y sus compras al lado de cada conversación."
      />

      <div className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning-tint px-4 py-3">
        <span className="size-2 shrink-0 rounded-full bg-warning" />
        <p className="text-[13px] text-text">
          <span className="font-medium">Número sin conectar.</span>{' '}
          <span className="text-text-secondary">
            Todavía no se reciben mensajes aquí. Los botones abren WhatsApp en tu teléfono o
            computadora.
          </span>
        </p>
      </div>

      <div className="panel-card flex min-h-[560px] flex-col overflow-hidden md:flex-row">
        <div className="flex max-h-72 shrink-0 flex-col border-b border-border md:max-h-none md:w-72 md:border-b-0 md:border-r">
          <div className="border-b border-border p-3">
            <SearchField aria-label="Buscar cliente" value={query} onChange={setQuery}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Buscar cliente" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>
          {customers.isPending ? (
            <div className="flex flex-col gap-3 p-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {rows.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    aria-current={selected?.id === customer.id ? 'true' : undefined}
                    onClick={() => setSelectedId(customer.id)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${selected?.id === customer.id ? 'bg-bg-alt' : 'hover:bg-bg'}`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-semibold text-brand">
                      {initials(customer.name)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13.5px] font-medium text-text">
                        {customer.name}
                      </span>
                      <span className="panel-meta truncate">
                        {formatPhone(customer.phone ?? '')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {customers.error ? (
          <div className="flex-1 p-4">
            <ErrorNotice error={customers.error} title="No se pudieron cargar los clientes" />
          </div>
        ) : selected ? (
          <ConversationPane key={selected.id} customer={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<IconChat size={18} />}
              title={query.trim() ? 'Sin resultados' : 'Todavía no hay clientes con teléfono'}
              description="Se añaden solos cuando registras una venta con su teléfono."
              action={
                <Button size="sm" variant="tertiary" onPress={() => void navigate('/ventas/nueva')}>
                  <IconPlus size={14} />
                  Registrar venta
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
