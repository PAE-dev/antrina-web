import {
  Button,
  Description,
  Drawer,
  Input,
  Label,
  Skeleton,
  Switch,
  TextField,
  toast,
} from '@heroui/react';
import {
  ADMIN_USERS_ROUTES,
  type AdminRoleCode,
  type AdminUserDto,
  type CreateAdminUserRequest,
  type ResetAdminPasswordRequest,
  type UpdateAdminUserRequest,
} from '@antrina/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ME_QUERY_KEY, useCurrentAdmin } from '../auth/session';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorNotice } from '../components/ErrorNotice';
import { Choice } from '../components/PageKit';
import { api } from '../lib/api';
import { ADMIN_ROLE_LABELS, formatDate } from '../lib/format';

const NEW_ID = 'nuevo';
const CLOSE_ANIMATION_MS = 220;
const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_PASSWORD_LENGTH = 16;

const ROLE_OPTIONS: { id: AdminRoleCode; label: string }[] = [
  { id: 'EDITOR', label: ADMIN_ROLE_LABELS.EDITOR },
  { id: 'OWNER', label: ADMIN_ROLE_LABELS.OWNER },
];

const ROLE_HELP: Record<AdminRoleCode, string> = {
  EDITOR: 'Productos, inventario, ventas, clientes y portada. No puede gestionar usuarios.',
  OWNER: 'Todo lo anterior, y además crear y administrar usuarios.',
};

function generatePassword(): string {
  const values = crypto.getRandomValues(new Uint32Array(GENERATED_PASSWORD_LENGTH));
  return Array.from(values, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join(
    '',
  );
}

/** Contraseña que un propietario asigna a otra persona: visible, porque tiene que pasársela. */
function AssignedPassword({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <TextField value={value} onChange={onChange} className="min-w-0 flex-1">
        <Label>{label}</Label>
        <Input autoComplete="off" spellCheck={false} className="font-mono" maxLength={200} />
      </TextField>
      <Button
        variant="tertiary"
        onPress={() => {
          const generated = generatePassword();
          onChange(generated);
          void navigator.clipboard
            .writeText(generated)
            .then(() => toast.success('Contraseña generada y copiada'))
            .catch(() => toast('Contraseña generada: cópiala antes de guardar'));
        }}
      >
        Generar
      </Button>
    </div>
  );
}

export function UserDrawer() {
  const { id = NEW_ID } = useParams();
  const isNew = id === NEW_ID;
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const user = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api<AdminUserDto>('GET', ADMIN_USERS_ROUTES.user(id)),
    enabled: !isNew,
  });

  const close = () => {
    setIsOpen(false);
    window.setTimeout(() => void navigate('/usuarios'), CLOSE_ANIMATION_MS);
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
          aria-label={isNew ? 'Nuevo usuario' : 'Usuario'}
          className="w-full max-w-full p-0 sm:w-[min(520px,100vw)]"
        >
          {user.error ? (
            <div className="p-6">
              <ErrorNotice error={user.error} title="No se pudo cargar el usuario" />
            </div>
          ) : !isNew && !user.data ? (
            <div className="flex flex-col gap-4 p-6" aria-label="Cargando usuario">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <UserEditor key={user.data?.id ?? NEW_ID} user={user.data} onClose={close} />
          )}
          <Drawer.CloseTrigger aria-label="Cerrar" />
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

function UserEditor({ user, onClose }: { user: AdminUserDto | undefined; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useCurrentAdmin();
  const isSelf = user?.id === me.data?.id;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<AdminRoleCode>(user?.role ?? 'EDITOR');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [password, setPassword] = useState('');

  const save = useMutation({
    mutationFn: () => {
      if (user) {
        const body: UpdateAdminUserRequest = { name, email, role, isActive };
        return api<AdminUserDto>('PUT', ADMIN_USERS_ROUTES.user(user.id), body);
      }
      const body: CreateAdminUserRequest = { name, email, role, password };
      return api<AdminUserDto>('POST', ADMIN_USERS_ROUTES.users, body);
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['admin', 'user', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(user ? 'Usuario actualizado' : 'Usuario creado');
      if (!user) {
        void navigate(`/usuarios/${saved.id}`, { replace: true });
      } else if (isSelf) {
        await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        if (saved.role !== 'OWNER') void navigate('/resumen', { replace: true });
      }
    },
  });

  const isDirty =
    name !== (user?.name ?? '') ||
    email !== (user?.email ?? '') ||
    role !== (user?.role ?? 'EDITOR') ||
    isActive !== (user?.isActive ?? true);
  const canSubmit = name.trim() && email.trim() && (user ? isDirty : password);

  return (
    <>
      <Drawer.Header className="px-6 pt-5">
        <Drawer.Heading className="pr-10 text-[18px] font-semibold tracking-[-0.02em] text-text">
          {user ? user.name : 'Nuevo usuario'}
        </Drawer.Heading>
        {user && (
          <p className="panel-meta">
            {user.lastLoginAt
              ? `Último ingreso: ${formatDate(user.lastLoginAt)}`
              : 'Todavía no ha entrado'}
            {user.hasTotp ? ' · Con app autenticadora' : ''}
          </p>
        )}
      </Drawer.Header>
      <Drawer.Body className="m-0 flex flex-col gap-6 px-6 py-5">
        <ErrorNotice error={save.error} title="No se pudo guardar" />
        <div className="flex flex-col gap-4">
          <TextField isRequired value={name} onChange={setName}>
            <Label>Nombre</Label>
            <Input maxLength={80} autoFocus={!user} autoComplete="off" />
          </TextField>
          <TextField isRequired type="email" value={email} onChange={setEmail}>
            <Label>Correo</Label>
            <Input maxLength={160} autoComplete="off" />
            <Description>Con este correo entrará al panel.</Description>
          </TextField>
          <div className="flex flex-col gap-1.5">
            <Choice
              label="Rol"
              isRequired
              value={role}
              options={ROLE_OPTIONS}
              onChange={(value) => setRole(value as AdminRoleCode)}
            />
            <p className="text-[12.5px] text-text-muted">{ROLE_HELP[role]}</p>
          </div>
          {!user && (
            <div className="flex flex-col gap-1.5">
              <AssignedPassword label="Contraseña" value={password} onChange={setPassword} />
              <p className="text-[12.5px] text-text-muted">
                Cópiala y pásasela. Después no se podrá volver a ver: solo asignar otra.
              </p>
            </div>
          )}
          {user && (
            <Switch
              isSelected={isActive}
              isDisabled={isSelf}
              onChange={setIsActive}
              className="flex w-full flex-row items-center justify-between gap-4 rounded-md border border-border px-4 py-3"
            >
              <Switch.Content>
                <Label className="text-[13.5px] font-medium">Puede entrar al panel</Label>
                <Description>
                  {isSelf
                    ? 'No puedes desactivar tu propia cuenta.'
                    : 'Al desactivarlo se cierran sus sesiones. Su historial se conserva.'}
                </Description>
              </Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
          )}
        </div>

        {user &&
          (isSelf ? (
            <section className="flex flex-col gap-1 border-t border-border pt-5">
              <h3 className="panel-heading">Contraseña</h3>
              <p className="text-[13px] text-text-muted">
                La tuya se cambia desde{' '}
                <Link to="/mi-cuenta" className="font-medium text-text underline">
                  Mi cuenta
                </Link>
                .
              </p>
            </section>
          ) : (
            <PasswordReset user={user} />
          ))}
      </Drawer.Body>
      <Drawer.Footer className="mt-0 justify-end gap-2 border-t border-border px-6 py-3">
        <Button size="sm" variant="tertiary" onPress={onClose}>
          {isDirty || !user ? 'Cancelar' : 'Cerrar'}
        </Button>
        <Button
          size="sm"
          variant="primary"
          isPending={save.isPending}
          isDisabled={!canSubmit}
          onPress={() => save.mutate()}
        >
          {user ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </Drawer.Footer>
    </>
  );
}

function PasswordReset({ user }: { user: AdminUserDto }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const reset = useMutation({
    mutationFn: () => {
      const body: ResetAdminPasswordRequest = { password };
      return api<AdminUserDto>('PUT', ADMIN_USERS_ROUTES.password(user.id), body);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'user', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setPassword('');
      toast.success('Contraseña asignada');
    },
    onSettled: () => setIsConfirming(false),
  });

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex flex-col gap-1">
        <h3 className="panel-heading">Asignar contraseña nueva</h3>
        <p className="text-[13px] text-text-muted">
          La contraseña actual no se puede ver. Si la olvidó, asígnale otra: también levanta el
          bloqueo por intentos fallidos.
        </p>
      </div>
      <ErrorNotice error={reset.error} title="No se pudo asignar la contraseña" />
      <AssignedPassword label="Contraseña nueva" value={password} onChange={setPassword} />
      <Button
        size="sm"
        variant="secondary"
        className="self-start"
        isDisabled={!password}
        onPress={() => setIsConfirming(true)}
      >
        Asignar contraseña
      </Button>
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title={`¿Asignar contraseña a ${user.name}?`}
        confirmLabel="Asignar"
        tone="warning"
        isPending={reset.isPending}
        onConfirm={() => reset.mutate()}
      >
        Su contraseña anterior dejará de funcionar y se cerrarán sus sesiones abiertas.
      </ConfirmDialog>
    </section>
  );
}
