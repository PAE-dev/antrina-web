import { Button, Dropdown, Spinner, Toast, Tooltip } from '@heroui/react';
import { type AdminMeDto } from '@antrina/contracts';
import { type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router';
import { useCurrentAdmin, useLogout } from '../auth/session';
import { STORE_URL } from '../lib/api';
import { BrandMark } from './BrandMark';
import { ErrorNotice } from './ErrorNotice';
import {
  IconBox,
  IconChat,
  IconExternal,
  IconHome,
  IconImage,
  IconLayers,
  IconLogout,
  IconReceipt,
  IconTag,
  IconUsers,
} from './icons';
import { initials } from '../lib/format';

const NAVIGATION: { title: string; items: { to: string; label: string; icon: ReactNode }[] }[] = [
  {
    title: 'Negocio',
    items: [
      { to: '/resumen', label: 'Resumen', icon: <IconHome /> },
      { to: '/ventas', label: 'Ventas', icon: <IconReceipt /> },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { to: '/productos', label: 'Productos', icon: <IconBox /> },
      { to: '/inventario', label: 'Inventario', icon: <IconLayers /> },
      { to: '/categorias', label: 'Categorías', icon: <IconTag /> },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { to: '/clientes', label: 'Clientes', icon: <IconUsers /> },
      { to: '/whatsapp', label: 'WhatsApp', icon: <IconChat /> },
    ],
  },
  {
    title: 'Contenido',
    items: [{ to: '/portada', label: 'Portada', icon: <IconImage /> }],
  },
];

const ROLE_LABELS: Record<AdminMeDto['role'], string> = {
  OWNER: 'Propietario',
  EDITOR: 'Editor',
};

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-semibold text-brand">
      {initials(name)}
    </span>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors ${
          isActive ? 'bg-bg-alt text-text' : 'text-text-secondary hover:bg-bg hover:text-text'
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

/** Rutas protegidas: exige sesión completa (contraseña + 2FA). */
export function AdminLayout() {
  const me = useCurrentAdmin();
  const logout = useLogout();
  const navigate = useNavigate();

  if (me.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner aria-label="Cargando" />
      </div>
    );
  }
  if (me.isError) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <ErrorNotice error={me.error} title="No se pudo verificar la sesión" />
      </div>
    );
  }
  if (!me.data) return <Navigate to="/login" replace />;

  const admin = me.data;
  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => void navigate('/login', { replace: true }) });

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center px-4">
          <BrandMark />
        </div>
        <nav
          aria-label="Secciones"
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pt-4"
        >
          {NAVIGATION.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1.5 text-[12px] font-medium text-text-muted">{group.title}</p>
              {group.items.map((item) => (
                <NavItem key={item.to} to={item.to} icon={item.icon}>
                  {item.label}
                </NavItem>
              ))}
            </div>
          ))}
          {STORE_URL && (
            <div className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1.5 text-[12px] font-medium text-text-muted">Tienda</p>
              <a
                href={STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium text-text-secondary transition-colors hover:bg-bg hover:text-text"
              >
                <IconExternal />
                Ver tienda
              </a>
            </div>
          )}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-border p-3">
          <Avatar name={admin.name} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium text-text">{admin.name}</span>
            <span className="truncate text-[12px] text-text-muted">{ROLE_LABELS[admin.role]}</span>
          </div>
          <Tooltip delay={300}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Cerrar sesión"
              isPending={logout.isPending}
              onPress={signOut}
            >
              <IconLogout />
            </Button>
            <Tooltip.Content>Cerrar sesión</Tooltip.Content>
          </Tooltip>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <BrandMark />
        <Dropdown>
          <Dropdown.Trigger aria-label="Cuenta" className="rounded-full">
            <Avatar name={admin.name} />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              aria-label="Cuenta"
              onAction={(key) => {
                if (typeof key === 'string' && key.startsWith('/')) void navigate(key);
                if (key === 'store') window.open(STORE_URL, '_blank', 'noreferrer');
                if (key === 'logout') signOut();
              }}
            >
              <Dropdown.Item id="who" textValue={admin.email} isDisabled>
                <span className="text-[12px] text-text-muted">{admin.email}</span>
              </Dropdown.Item>
              {NAVIGATION.flatMap((group) => group.items).map((item) => (
                <Dropdown.Item key={item.to} id={item.to} textValue={item.label}>
                  {item.label}
                </Dropdown.Item>
              ))}
              {STORE_URL ? (
                <Dropdown.Item id="store" textValue="Ver tienda">
                  Ver tienda
                </Dropdown.Item>
              ) : null}
              <Dropdown.Item id="logout" textValue="Cerrar sesión">
                Cerrar sesión
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
      <Toast.Provider placement="top" />
    </div>
  );
}
