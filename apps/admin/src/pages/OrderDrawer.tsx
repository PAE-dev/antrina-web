import {
  Button,
  Drawer,
  Input,
  InputGroup,
  Label,
  SearchField,
  Skeleton,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import {
  ADMIN_CATALOG_ROUTES,
  ADMIN_SALES_ROUTES,
  type AdminProductDto,
  type AdminProductListItemDto,
  type AdminProductListResponse,
  type CreateOrderRequest,
  type CustomerDto,
  type CustomerListResponse,
  type OrderChannelCode,
  type OrderDto,
  type OrderStatusCode,
  type PaymentMethodCode,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconChat, IconImage, IconMinus, IconPlus, IconTrash } from '../components/icons';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { Choice } from '../components/PageKit';
import { invalidateStock } from '../components/StockDialog';
import { api } from '../lib/api';
import {
  CHANNEL_LABELS,
  centsToInput,
  formatDate,
  formatPhone,
  ORDER_STATUS_LABELS,
  parsePriceToCents,
  PAYMENT_LABELS,
  toDateTimeInput,
  whatsappUrl,
} from '../lib/format';

const NEW_ID = 'nueva';
const CLOSE_ANIMATION_MS = 220;
const OPEN_STATUSES: Exclude<OrderStatusCode, 'CANCELLED'>[] = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
];
const NO_PAYMENT = 'NONE';

const invalidateSales = (queryClient: ReturnType<typeof useQueryClient>) => {
  invalidateStock(queryClient);
  for (const key of ['orders', 'order', 'customers', 'customer']) {
    void queryClient.invalidateQueries({ queryKey: ['admin', key] });
  }
};

/** `/ventas/nueva` registra una venta; `/ventas/:id` muestra su detalle y su estado. */
export function OrderDrawer() {
  const { id = NEW_ID } = useParams();
  const isNew = id === NEW_ID;
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = useRef(false);

  const order = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => api<OrderDto>('GET', ADMIN_SALES_ROUTES.order(id)),
    enabled: !isNew,
  });

  const close = () => {
    setConfirmDiscard(false);
    setIsOpen(false);
    window.setTimeout(() => void navigate('/ventas'), CLOSE_ANIMATION_MS);
  };
  const requestClose = () => (dirty.current ? setConfirmDiscard(true) : close());

  return (
    <>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <Drawer.Content placement="right">
          <Drawer.Dialog
            aria-label={isNew ? 'Registrar venta' : 'Detalle de la venta'}
            className="w-full max-w-full p-0 sm:w-[min(640px,100vw)]"
          >
            {isNew ? (
              <NewOrderForm
                onDirtyChange={(value) => {
                  dirty.current = value;
                }}
                onClose={requestClose}
                onCreated={(created) => {
                  dirty.current = false;
                  void navigate(`/ventas/${created.id}`, { replace: true });
                }}
              />
            ) : order.error ? (
              <div className="p-6">
                <ErrorNotice error={order.error} title="No se pudo cargar la venta" />
              </div>
            ) : order.data ? (
              <OrderDetail order={order.data} onClose={close} />
            ) : (
              <div className="flex flex-col gap-4 p-6" aria-label="Cargando venta">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-9 w-full rounded-md" />
                ))}
              </div>
            )}
            <Drawer.CloseTrigger aria-label="Cerrar" />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
      <ConfirmDialog
        isOpen={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="¿Descartar esta venta?"
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        tone="warning"
        onConfirm={close}
      >
        Todavía no se ha registrado. Si cierras ahora se perderá.
      </ConfirmDialog>
    </>
  );
}

interface LineForm {
  productId: string;
  name: string;
  sku: string;
  coverUrl: string | null;
  available: number;
  quantity: string;
  unitPrice: string;
}

const toLine = (product: {
  id: string;
  name: string;
  sku: string;
  coverUrl: string | null;
  stock: number;
  priceCents: number;
}): LineForm => ({
  productId: product.id,
  name: product.name,
  sku: product.sku,
  coverUrl: product.coverUrl,
  available: product.stock,
  quantity: '1',
  unitPrice: centsToInput(product.priceCents),
});

function ProductPicker({
  selectedIds,
  onPick,
}: {
  selectedIds: string[];
  onPick: (product: AdminProductListItemDto) => void;
}) {
  const [query, setQuery] = useState('');
  const term = query.trim();
  const results = useQuery({
    queryKey: ['admin', 'products', 'picker', term],
    queryFn: () =>
      api<AdminProductListResponse>(
        'GET',
        `${ADMIN_CATALOG_ROUTES.products}?status=ACTIVE&pageSize=6&q=${encodeURIComponent(term)}`,
      ),
    enabled: term.length > 0,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <SearchField aria-label="Buscar producto" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Busca por nombre o SKU para añadirlo" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {term.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {results.isPending ? (
            <li className="p-3">
              <Skeleton className="h-4 w-1/2 rounded-sm" />
            </li>
          ) : (results.data?.data.length ?? 0) === 0 ? (
            <li className="px-3 py-2.5 text-[13px] text-text-muted">
              Sin resultados entre los productos publicados.
            </li>
          ) : (
            results.data?.data.map((product) => {
              const isAdded = selectedIds.includes(product.id);
              const isOut = product.stock === 0;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={isAdded || isOut}
                    onClick={() => {
                      onPick(product);
                      setQuery('');
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-text">
                        {product.name}
                      </span>
                      <span className="block truncate font-mono text-[12px] text-text-muted">
                        {product.sku}
                      </span>
                    </span>
                    <span
                      className={`panel-num text-[12.5px] ${isOut ? 'text-danger' : 'text-text-muted'}`}
                    >
                      {isAdded ? 'Añadido' : isOut ? 'Agotado' : `${product.stock} disp.`}
                    </span>
                    <span className="panel-num text-[13.5px] font-medium text-text">
                      {formatMoney(product.price, 'es')}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function CustomerFields({
  customer,
  name,
  phone,
  onName,
  onPhone,
  onSelect,
}: {
  customer: CustomerDto | null;
  name: string;
  phone: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onSelect: (customer: CustomerDto | null) => void;
}) {
  const term = name.trim();
  const matches = useQuery({
    queryKey: ['admin', 'customers', 'picker', term],
    queryFn: () =>
      api<CustomerListResponse>(
        'GET',
        `${ADMIN_SALES_ROUTES.customers}?pageSize=4&q=${encodeURIComponent(term)}`,
      ),
    enabled: term.length >= 2 && !customer,
  });

  if (customer) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13.5px] font-medium text-text">{customer.name}</span>
          <span className="panel-meta truncate">
            {customer.phone ? formatPhone(customer.phone) : 'Sin teléfono'} · {customer.orderCount}{' '}
            {customer.orderCount === 1 ? 'compra' : 'compras'}
          </span>
        </div>
        <Button size="sm" variant="ghost" onPress={() => onSelect(null)}>
          Cambiar
        </Button>
      </div>
    );
  }
  const suggestions = matches.data?.data ?? [];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField value={name} onChange={onName}>
          <Label>Nombre</Label>
          <Input maxLength={120} placeholder="Opcional" autoComplete="off" />
        </TextField>
        <TextField value={phone} onChange={onPhone}>
          <Label>Teléfono / WhatsApp</Label>
          <Input inputMode="tel" maxLength={40} placeholder="987 654 321" autoComplete="off" />
        </TextField>
      </div>
      {suggestions.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {suggestions.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                onClick={() => onSelect(match)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition-colors hover:bg-bg"
              >
                <span className="truncate font-medium text-text">{match.name}</span>
                <span className="panel-meta shrink-0">
                  {match.phone ? formatPhone(match.phone) : 'Sin teléfono'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Heading = ({ children }: { children: string }) => (
  <h3 className="panel-heading">{children}</h3>
);

function NewOrderForm({
  onDirtyChange,
  onClose,
  onCreated,
}: {
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onCreated: (order: OrderDto) => void;
}) {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('producto');
  const [lines, setLines] = useState<LineForm[]>([]);
  const [customer, setCustomer] = useState<CustomerDto | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<OrderChannelCode>('WHATSAPP');
  const [payment, setPayment] = useState<string>('YAPE');
  const [status, setStatus] = useState<Exclude<OrderStatusCode, 'CANCELLED'>>('PAID');
  const [soldAt, setSoldAt] = useState(() => toDateTimeInput(new Date()));
  const [shipping, setShipping] = useState('');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  // "Vender" desde la lista de productos: la venta nace con ese producto ya añadido.
  const preselected = useQuery({
    queryKey: ['admin', 'product', initialProductId],
    queryFn: () =>
      api<AdminProductDto>('GET', ADMIN_CATALOG_ROUTES.product(initialProductId ?? '')),
    enabled: Boolean(initialProductId),
  });
  const preselectedData = preselected.data;
  useEffect(() => {
    if (!preselectedData || preselectedData.stock === 0) return;
    setLines((current) =>
      current.length > 0
        ? current
        : [
            toLine({
              id: preselectedData.id,
              name: preselectedData.content.es.name,
              sku: preselectedData.sku,
              coverUrl: preselectedData.images[0]?.url ?? null,
              stock: preselectedData.stock,
              priceCents: preselectedData.price.amount,
            }),
          ],
    );
  }, [preselectedData]);

  const isDirty = lines.length > 0 || Boolean(customerName.trim() || phone.trim() || customer);
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateLine = (productId: string, patch: Partial<LineForm>) =>
    setLines((current) =>
      current.map((line) => (line.productId === productId ? { ...line, ...patch } : line)),
    );

  const subtotal = lines.reduce(
    (sum, line) => sum + (parsePriceToCents(line.unitPrice) ?? 0) * (Number(line.quantity) || 0),
    0,
  );
  const shippingCents = shipping.trim() ? parsePriceToCents(shipping) : 0;
  const discountCents = discount.trim() ? parsePriceToCents(discount) : 0;
  const total = subtotal + (shippingCents ?? 0) - (discountCents ?? 0);

  const save = useMutation({
    mutationFn: (body: CreateOrderRequest) =>
      api<OrderDto>('POST', ADMIN_SALES_ROUTES.orders, body),
    onSuccess: (created) => {
      invalidateSales(queryClient);
      toast.success(`Venta #${created.number} registrada`, {
        description: 'El stock se descontó automáticamente.',
      });
      onCreated(created);
    },
  });

  const submit = () => {
    if (lines.length === 0) {
      setClientError('Añade al menos un producto.');
      return;
    }
    const orderLines = [];
    for (const line of lines) {
      const quantity = Number(line.quantity);
      const unitPriceCents = parsePriceToCents(line.unitPrice);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        setClientError(`Revisa la cantidad de "${line.name}".`);
        return;
      }
      if (quantity > line.available) {
        setClientError(`Solo hay ${line.available} unidades de "${line.name}".`);
        return;
      }
      if (unitPriceCents === null) {
        setClientError(`Revisa el precio de "${line.name}".`);
        return;
      }
      orderLines.push({ productId: line.productId, quantity, unitPriceCents });
    }
    if (shippingCents === null || discountCents === null) {
      setClientError('Revisa el envío y el descuento: usa números como 15 o 15.50.');
      return;
    }
    if (total < 0) {
      setClientError('El descuento no puede ser mayor que el total.');
      return;
    }
    if (phone.trim() && !customerName.trim() && !customer) {
      setClientError('Escribe también el nombre del cliente.');
      return;
    }
    setClientError(null);
    save.mutate({
      status,
      channel,
      paymentMethod: payment === NO_PAYMENT ? null : (payment as PaymentMethodCode),
      customerId: customer?.id ?? null,
      customer:
        !customer && customerName.trim()
          ? { name: customerName.trim(), phone: phone.trim() || null, email: null, note: null }
          : null,
      currency: 'PEN',
      lines: orderLines,
      shippingCents,
      discountCents,
      note: note.trim() || null,
      soldAt: new Date(soldAt).toISOString(),
    });
  };

  return (
    <>
      <Drawer.Header className="px-6 pt-5">
        <Drawer.Heading className="pr-10 text-[18px] font-semibold tracking-[-0.02em] text-text">
          Registrar venta
        </Drawer.Heading>
      </Drawer.Header>
      <Drawer.Body className="m-0 flex flex-col gap-6 px-6 py-5">
        <section className="flex flex-col gap-3">
          <Heading>Productos</Heading>
          <ProductPicker
            selectedIds={lines.map((line) => line.productId)}
            onPick={(product) =>
              setLines((current) => [
                ...current,
                toLine({ ...product, priceCents: product.price.amount }),
              ])
            }
          />
          {lines.length > 0 && (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {lines.map((line) => {
                const quantity = Number(line.quantity) || 0;
                return (
                  <li key={line.productId} className="flex flex-col gap-2 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-bg-alt text-text-muted">
                        {line.coverUrl ? (
                          <img src={line.coverUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <IconImage size={14} />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13.5px] font-medium text-text">
                          {line.name}
                        </span>
                        <span
                          className={`panel-meta panel-num ${quantity > line.available ? 'font-medium text-danger' : ''}`}
                        >
                          {line.available} disponibles
                        </span>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={`Quitar ${line.name}`}
                        onPress={() =>
                          setLines((current) =>
                            current.filter((item) => item.productId !== line.productId),
                          )
                        }
                      >
                        <IconTrash />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="tertiary"
                          aria-label="Una menos"
                          isDisabled={quantity <= 1}
                          onPress={() =>
                            updateLine(line.productId, { quantity: String(quantity - 1) })
                          }
                        >
                          <IconMinus />
                        </Button>
                        <TextField
                          aria-label="Cantidad"
                          type="number"
                          value={line.quantity}
                          onChange={(value) => updateLine(line.productId, { quantity: value })}
                          className="w-16"
                        >
                          <Input min={1} step={1} className="panel-num text-center" />
                        </TextField>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="tertiary"
                          aria-label="Una más"
                          isDisabled={quantity >= line.available}
                          onPress={() =>
                            updateLine(line.productId, { quantity: String(quantity + 1) })
                          }
                        >
                          <IconPlus />
                        </Button>
                      </div>
                      <span className="text-[13px] text-text-muted">×</span>
                      <TextField
                        aria-label="Precio unitario"
                        value={line.unitPrice}
                        onChange={(value) => updateLine(line.productId, { unitPrice: value })}
                        className="w-28"
                      >
                        <InputGroup>
                          <InputGroup.Prefix className="text-[13px] text-text-muted">
                            S/
                          </InputGroup.Prefix>
                          <InputGroup.Input inputMode="decimal" className="panel-num" />
                        </InputGroup>
                      </TextField>
                      <span className="panel-num ml-auto text-[13.5px] font-medium text-text">
                        {formatMoney(
                          {
                            amount: (parsePriceToCents(line.unitPrice) ?? 0) * quantity,
                            currency: 'PEN',
                          },
                          'es',
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <Heading>Cliente</Heading>
          <CustomerFields
            customer={customer}
            name={customerName}
            phone={phone}
            onName={setCustomerName}
            onPhone={setPhone}
            onSelect={(next) => {
              setCustomer(next);
              if (next) {
                setCustomerName('');
                setPhone('');
              }
            }}
          />
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <Heading>Detalles</Heading>
          <div className="grid gap-4 sm:grid-cols-2">
            <Choice
              label="Canal"
              value={channel}
              onChange={(value) => setChannel(value as OrderChannelCode)}
              options={(Object.keys(CHANNEL_LABELS) as OrderChannelCode[]).map((code) => ({
                id: code,
                label: CHANNEL_LABELS[code],
              }))}
            />
            <Choice
              label="Forma de pago"
              value={payment}
              onChange={setPayment}
              options={[
                ...(Object.keys(PAYMENT_LABELS) as PaymentMethodCode[]).map((code) => ({
                  id: code,
                  label: PAYMENT_LABELS[code],
                })),
                { id: NO_PAYMENT, label: 'Sin definir' },
              ]}
            />
            <Choice
              label="Estado"
              value={status}
              onChange={(value) => setStatus(value as typeof status)}
              options={OPEN_STATUSES.map((code) => ({
                id: code,
                label: ORDER_STATUS_LABELS[code],
              }))}
            />
            <TextField type="datetime-local" value={soldAt} onChange={setSoldAt}>
              <Label>Fecha de la venta</Label>
              <Input />
            </TextField>
            <TextField value={shipping} onChange={setShipping}>
              <Label>Envío</Label>
              <InputGroup>
                <InputGroup.Prefix className="text-[13px] text-text-muted">S/</InputGroup.Prefix>
                <InputGroup.Input inputMode="decimal" placeholder="0" className="panel-num" />
              </InputGroup>
            </TextField>
            <TextField value={discount} onChange={setDiscount}>
              <Label>Descuento</Label>
              <InputGroup>
                <InputGroup.Prefix className="text-[13px] text-text-muted">S/</InputGroup.Prefix>
                <InputGroup.Input inputMode="decimal" placeholder="0" className="panel-num" />
              </InputGroup>
            </TextField>
          </div>
          <TextField value={note} onChange={setNote}>
            <Label>Nota interna</Label>
            <TextArea rows={2} maxLength={1000} placeholder="Dirección, dedicatoria, encargo…" />
          </TextField>
        </section>

        {clientError && <ErrorNotice error={new Error(clientError)} title="Revisa la venta" />}
        <ErrorNotice error={save.error} title="No se pudo registrar" />
      </Drawer.Body>
      <Drawer.Footer className="mt-0 items-center justify-between gap-3 border-t border-border px-6 py-3">
        <div className="flex flex-col">
          <span className="panel-meta">Total</span>
          <span className="panel-num text-[17px] font-semibold tracking-[-0.01em] text-text">
            {formatMoney({ amount: Math.max(total, 0), currency: 'PEN' }, 'es')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="tertiary" onPress={onClose}>
            Cancelar
          </Button>
          <Button size="sm" variant="primary" isPending={save.isPending} onPress={submit}>
            Registrar venta
          </Button>
        </div>
      </Drawer.Footer>
    </>
  );
}

function OrderDetail({ order, onClose }: { order: OrderDto; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isCancelled = order.status === 'CANCELLED';

  const setCached = (saved: OrderDto) => {
    queryClient.setQueryData(['admin', 'order', saved.id], saved);
    invalidateSales(queryClient);
  };

  const changeStatus = useMutation({
    mutationFn: (status: OrderStatusCode) =>
      api<OrderDto>('PATCH', ADMIN_SALES_ROUTES.orderStatus(order.id), { status }),
    onSuccess: (saved) => {
      setCached(saved);
      toast.success(`Venta: ${ORDER_STATUS_LABELS[saved.status].toLowerCase()}`);
    },
  });
  const cancel = useMutation({
    mutationFn: () => api<OrderDto>('POST', ADMIN_SALES_ROUTES.cancelOrder(order.id)),
    onSuccess: (saved) => {
      setCached(saved);
      setConfirmCancel(false);
      toast.success('Venta cancelada', { description: 'Las unidades volvieron al stock.' });
    },
  });

  const rows: [string, string, boolean?][] = [
    ['Subtotal', formatMoney(order.subtotal, 'es')],
    ...(order.shipping.amount > 0
      ? ([['Envío', formatMoney(order.shipping, 'es')]] as [string, string][])
      : []),
    ...(order.discount.amount > 0
      ? ([['Descuento', `− ${formatMoney(order.discount, 'es')}`]] as [string, string][])
      : []),
  ];

  return (
    <>
      <Drawer.Header className="gap-0 px-6 pt-5">
        <div className="flex h-6 items-center gap-2 pr-10">
          <OrderStatusBadge status={order.status} />
          <span className="panel-meta truncate">{formatDate(order.soldAt)}</span>
        </div>
        <Drawer.Heading className="mt-2 pr-10 text-[18px] font-semibold tracking-[-0.02em] text-text">
          Venta #{order.number}
        </Drawer.Heading>
      </Drawer.Header>
      <Drawer.Body className="m-0 flex flex-col gap-6 px-6 py-5">
        <ErrorNotice error={changeStatus.error} title="No se pudo cambiar el estado" />
        <ErrorNotice error={cancel.error} title="No se pudo cancelar" />

        {!isCancelled && (
          <Choice
            label="Estado"
            value={order.status}
            isDisabled={changeStatus.isPending}
            onChange={(value) => {
              if (value !== order.status) changeStatus.mutate(value as OrderStatusCode);
            }}
            options={OPEN_STATUSES.map((code) => ({ id: code, label: ORDER_STATUS_LABELS[code] }))}
          />
        )}

        <section className="flex flex-col gap-2">
          <Heading>Productos</Heading>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {order.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/productos/${line.productId}`}
                    className="truncate text-[13.5px] font-medium text-text hover:underline"
                  >
                    {line.name}
                  </Link>
                  <span className="panel-meta panel-num">
                    {line.quantity} × {formatMoney(line.unitPrice, 'es')}
                  </span>
                </div>
                <span className="panel-num text-[13.5px] font-medium text-text">
                  {formatMoney(line.lineTotal, 'es')}
                </span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 pt-1 text-[13px]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-text-secondary">
                <dt>{label}</dt>
                <dd className="panel-num">{value}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-border pt-2 text-[14.5px] font-semibold text-text">
              <dt>Total</dt>
              <dd className={`panel-num ${isCancelled ? 'text-text-muted line-through' : ''}`}>
                {formatMoney(order.total, 'es')}
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-5">
          <Heading>Cliente</Heading>
          {order.customer ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <Link
                  to={`/clientes/${order.customer.id}`}
                  className="truncate text-[13.5px] font-medium text-text hover:underline"
                >
                  {order.customer.name}
                </Link>
                {order.customer.phone && (
                  <span className="panel-meta">{formatPhone(order.customer.phone)}</span>
                )}
              </div>
              {order.customer.phone && (
                <a
                  href={whatsappUrl(
                    order.customer.phone,
                    `Hola ${order.customer.name}, te escribimos de Antrina por tu compra #${order.number}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium text-text transition-colors hover:bg-bg"
                >
                  <IconChat size={15} />
                  WhatsApp
                </a>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">Venta sin cliente identificado.</p>
          )}
        </section>

        <section className="flex flex-col gap-1.5 border-t border-border pt-5 text-[13px]">
          <Heading>Detalles</Heading>
          <p className="text-text-secondary">
            {CHANNEL_LABELS[order.channel]}
            {order.paymentMethod && ` · ${PAYMENT_LABELS[order.paymentMethod]}`}
          </p>
          {order.createdByName && (
            <p className="text-text-muted">Registrada por {order.createdByName}</p>
          )}
          {order.note && <p className="whitespace-pre-line text-text-secondary">{order.note}</p>}
        </section>
      </Drawer.Body>
      <Drawer.Footer className="mt-0 justify-between gap-3 border-t border-border px-6 py-3">
        {isCancelled ? (
          <span className="panel-meta">Cancelada: sus unidades ya volvieron al stock.</span>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            onPress={() => setConfirmCancel(true)}
          >
            Cancelar venta
          </Button>
        )}
        <Button size="sm" variant="tertiary" onPress={onClose}>
          Cerrar
        </Button>
      </Drawer.Footer>
      <ConfirmDialog
        isOpen={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={`¿Cancelar la venta #${order.number}?`}
        confirmLabel="Cancelar venta"
        cancelLabel="Volver"
        isPending={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      >
        Sus {order.unitCount} {order.unitCount === 1 ? 'unidad vuelve' : 'unidades vuelven'} al
        stock y deja de contar en tus ingresos. No se puede deshacer.
      </ConfirmDialog>
    </>
  );
}
