import {
  Button,
  Description,
  Drawer,
  Input,
  Label,
  Skeleton,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import {
  ADMIN_SALES_ROUTES,
  type CustomerDto,
  type OrderListResponse,
  type UpsertCustomerRequest,
} from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorNotice } from '../components/ErrorNotice';
import { IconChat } from '../components/icons';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { api } from '../lib/api';
import { formatPhone, formatShortDate, whatsappUrl } from '../lib/format';

const NEW_ID = 'nuevo';
const CLOSE_ANIMATION_MS = 220;

export function CustomerDrawer() {
  const { id = NEW_ID } = useParams();
  const isNew = id === NEW_ID;
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const customer = useQuery({
    queryKey: ['admin', 'customer', id],
    queryFn: () => api<CustomerDto>('GET', ADMIN_SALES_ROUTES.customer(id)),
    enabled: !isNew,
  });

  const close = () => {
    setIsOpen(false);
    window.setTimeout(() => void navigate('/clientes'), CLOSE_ANIMATION_MS);
  };

  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Drawer.Content placement="right">
        <Drawer.Dialog
          aria-label={isNew ? 'Nuevo cliente' : 'Cliente'}
          className="w-full max-w-full p-0 sm:w-[min(520px,100vw)]"
        >
          {customer.error ? (
            <div className="p-6">
              <ErrorNotice error={customer.error} title="No se pudo cargar el cliente" />
            </div>
          ) : !isNew && !customer.data ? (
            <div className="flex flex-col gap-4 p-6" aria-label="Cargando cliente">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <CustomerEditor
              key={customer.data?.id ?? NEW_ID}
              customer={customer.data}
              onClose={close}
            />
          )}
          <Drawer.CloseTrigger aria-label="Cerrar" />
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

function CustomerEditor({
  customer,
  onClose,
}: {
  customer: CustomerDto | undefined;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [note, setNote] = useState(customer?.note ?? '');

  const orders = useQuery({
    queryKey: ['admin', 'orders', 'customer', customer?.id],
    queryFn: () =>
      api<OrderListResponse>(
        'GET',
        `${ADMIN_SALES_ROUTES.orders}?customerId=${customer?.id ?? ''}&pageSize=20`,
      ),
    enabled: Boolean(customer),
  });

  const save = useMutation({
    mutationFn: (body: UpsertCustomerRequest) =>
      customer
        ? api<CustomerDto>('PUT', ADMIN_SALES_ROUTES.customer(customer.id), body)
        : api<CustomerDto>('POST', ADMIN_SALES_ROUTES.customers, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'customer', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      toast.success(customer ? 'Cliente actualizado' : 'Cliente creado');
      if (!customer) void navigate(`/clientes/${saved.id}`, { replace: true });
    },
  });

  const isDirty =
    name !== (customer?.name ?? '') ||
    phone !== (customer?.phone ?? '') ||
    email !== (customer?.email ?? '') ||
    note !== (customer?.note ?? '');

  const submit = () =>
    save.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      note: note.trim() || null,
    });

  return (
    <>
      <Drawer.Header className="px-6 pt-5">
        <Drawer.Heading className="pr-10 text-[18px] font-semibold tracking-[-0.02em] text-text">
          {customer ? customer.name : 'Nuevo cliente'}
        </Drawer.Heading>
        {customer && (
          <p className="panel-meta panel-num">
            {customer.orderCount} {customer.orderCount === 1 ? 'compra' : 'compras'} ·{' '}
            {formatMoney(customer.totalSpent, 'es')} en total
          </p>
        )}
      </Drawer.Header>
      <Drawer.Body className="m-0 flex flex-col gap-6 px-6 py-5">
        <ErrorNotice error={save.error} title="No se pudo guardar" />
        {customer?.phone && (
          <a
            href={whatsappUrl(customer.phone, `Hola ${customer.name}, te escribimos de Antrina.`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border text-[13.5px] font-medium text-text transition-colors hover:bg-bg"
          >
            <IconChat />
            Abrir chat en WhatsApp
          </a>
        )}
        <div className="flex flex-col gap-4">
          <TextField isRequired value={name} onChange={setName}>
            <Label>Nombre</Label>
            <Input maxLength={120} autoFocus={!customer} />
          </TextField>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField value={phone} onChange={setPhone}>
              <Label>Teléfono / WhatsApp</Label>
              <Input inputMode="tel" maxLength={40} placeholder="987 654 321" />
              <Description>
                {customer?.phone ? formatPhone(customer.phone) : '9 dígitos, o con +código de país'}
              </Description>
            </TextField>
            <TextField type="email" value={email} onChange={setEmail}>
              <Label>Correo</Label>
              <Input maxLength={160} />
            </TextField>
          </div>
          <TextField value={note} onChange={setNote}>
            <Label>Notas</Label>
            <TextArea rows={3} maxLength={1000} placeholder="Gustos, cumpleaños, dirección…" />
          </TextField>
        </div>

        {customer && (
          <section className="flex flex-col gap-2 border-t border-border pt-5">
            <h3 className="panel-heading">Historial de compras</h3>
            {orders.isPending ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (orders.data?.data.length ?? 0) === 0 ? (
              <p className="text-[13px] text-text-muted">Todavía no ha comprado.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {orders.data?.data.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/ventas/${order.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-bg"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                        #{order.number} · {formatShortDate(order.soldAt)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <span className="panel-num text-[13.5px] font-medium text-text">
                        {formatMoney(order.total, 'es')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </Drawer.Body>
      <Drawer.Footer className="mt-0 justify-end gap-2 border-t border-border px-6 py-3">
        <Button size="sm" variant="tertiary" onPress={onClose}>
          {isDirty || !customer ? 'Cancelar' : 'Cerrar'}
        </Button>
        <Button
          size="sm"
          variant="primary"
          isPending={save.isPending}
          isDisabled={!isDirty || !name.trim()}
          onPress={submit}
        >
          {customer ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </Drawer.Footer>
    </>
  );
}
