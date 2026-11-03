import { type CustomerMeDto, TORITO_ROUTES, type ToritoListResponse } from '@antrina/contracts';
import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import { ForestExperience } from '../bosque/ForestExperience';
import { type World, WORLDS, worldById } from '../bosque/forest-world';
import { todayKey, yesterdayKey } from '../torito/torito-messages';
import { SavePrompt, ToritoWorld, type WorldScreenProps } from '../torito/EstabloExperience';
import { claimPendingTorito, ToritoApiError, toritoRequest } from '../torito/toritos-api';
import {
  clearPendingClaim,
  exampleCollection,
  type OwnedTorito,
  ownedFromDto,
  ownedFromPending,
  readPendingClaim,
} from '../torito/toritos';
import './app.css';
import { type AppRoute, appPath, parseAppPath } from './app-routes';
import { AppLoader, FOREST_ASSETS, useAssetGate } from './AppLoader';
import { ScanSheet } from './AppSheets';
import {
  DoorIcon,
  ForestIcon,
  LiquidTabBar,
  ProfileIcon,
  ScanIcon,
  ShopIcon,
} from './LiquidTabBar';
import { ProfileScreen } from './ProfileScreen';
import { ShopScreen } from './ShopScreen';

const TORITO_WORLD = 'torito';
const LOADER_FADE_MS = 420;

/** El interior de cada mundo: la cabecera, el menú y la carga son los mismos para todos. */
const WORLD_SCREENS: Record<string, ComponentType<WorldScreenProps>> = {
  [TORITO_WORLD]: ToritoWorld,
};

interface Props {
  initialRoute: AppRoute;
  customer: CustomerMeDto | null;
  /** Vista de ejemplo: enseña una colección inventada y no guarda nada. */
  exampleCount: number | null;
  /** Mundo que se acaba de ganar: el bosque va hasta su puerta y se abre. */
  unlockId: string | null;
  newToritoId: string | null;
  authError: string | null;
}

/** La racha solo cuenta si no se ha roto: la última visita fue hoy o ayer. */
function currentStreak(toritos: readonly OwnedTorito[]): number {
  const today = todayKey();
  const yesterday = yesterdayKey();
  return Math.max(
    0,
    ...toritos
      .filter((torito) => torito.lastVisitOn === today || torito.lastVisitOn === yesterday)
      .map((torito) => torito.visitStreak),
  );
}

export function AntrinaApp({
  initialRoute,
  customer: initialCustomer,
  exampleCount,
  unlockId,
  newToritoId,
  authError,
}: Props) {
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [customer, setCustomer] = useState(initialCustomer);
  const [isScanning, setIsScanning] = useState(false);
  const [shopPrefix, setShopPrefix] = useState<string | null>(null);
  const [toritos, setToritos] = useState<OwnedTorito[] | null>(
    exampleCount ? exampleCollection(exampleCount) : customer ? null : [],
  );
  const [pending, setPending] = useState<OwnedTorito | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(authError);
  const [celebrates, setCelebrates] = useState(unlockId === TORITO_WORLD || exampleCount !== null);
  const [skipsSaving, setSkipsSaving] = useState(false);
  const [lastDoorId, setLastDoorId] = useState<string | null>(
    initialRoute.view === 'world' ? initialRoute.id : null,
  );

  const isExample = exampleCount !== null;
  const world = route.view === 'world' ? (worldById(route.id) ?? null) : null;
  const persists = Boolean(customer) && !isExample;

  // Datos del cliente: si vuelve de iniciar sesión con un torito por guardar, se guarda aquí.
  useEffect(() => {
    if (isExample) return;
    const claim = readPendingClaim();
    if (!customer) {
      setPending(claim ? ownedFromPending(claim) : null);
      return;
    }
    const load = async () => {
      if (claim) {
        try {
          const torito = await claimPendingTorito(claim);
          setClaimedId(torito.id);
          setCelebrates(true);
          clearPendingClaim();
        } catch (failure) {
          setNotice(failure instanceof Error ? failure.message : 'No pudimos guardar tu torito.');
          // Si fue la conexión, sigue pendiente; si la pieza ya tiene dueño, no hay nada que reintentar.
          if (failure instanceof ToritoApiError && failure.status > 0 && failure.status < 500) {
            clearPendingClaim();
          }
        }
      }
      const { data } = await toritoRequest<ToritoListResponse>('GET', TORITO_ROUTES.toritos);
      setToritos(data.map(ownedFromDto));
    };
    load().catch((failure: unknown) => {
      setNotice(failure instanceof Error ? failure.message : 'No pudimos abrir tus mundos.');
      setToritos([]);
    });
  }, [customer, isExample]);

  // Los parámetros de un solo uso no deben repetir la escena al recargar.
  useEffect(() => {
    if (isExample) return;
    if (window.location.search) window.history.replaceState(null, '', appPath(initialRoute));
  }, [initialRoute, isExample]);

  useEffect(() => {
    const restore = () => {
      const next = parseAppPath(window.location.pathname);
      if (next) setRoute(next);
      setIsScanning(false);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  const go = useCallback((next: AppRoute) => {
    setIsScanning(false);
    setRoute(next);
    if (next.view === 'world') setLastDoorId(next.id);
    window.history.pushState(null, '', appPath(next));
  }, []);

  const closeScan = useCallback(() => setIsScanning(false), []);
  const openShop = useCallback(
    (prefix: string | null) => {
      setShopPrefix(prefix);
      go({ view: 'shop' });
    },
    [go],
  );

  const assetKey = world ? `world:${world.id}` : 'forest';
  const assets = useMemo(() => (world ? world.assets : FOREST_ASSETS), [world]);
  const { progress, isReady } = useAssetGate(assetKey, assets);
  const [isLoaderMounted, setLoaderMounted] = useState(true);
  useEffect(() => {
    if (!isReady) {
      setLoaderMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setLoaderMounted(false), LOADER_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [isReady]);

  const isOwner = isExample ? true : toritos === null ? null : toritos.length > 0;
  const openWorlds = isOwner ? 1 : 0;
  const unlockableWorlds = WORLDS.filter((item) => item.status === 'unlockable').length;

  const stats = useMemo(() => {
    const list = toritos ?? [];
    const pages = Math.max(1, Math.ceil(list.length / 3));
    const streak = currentStreak(list);
    if (world) {
      return [
        { label: world.collectionTab, value: toritos === null ? '–' : String(list.length) },
        { label: 'Establos', value: toritos === null ? '–' : String(pages) },
        { label: 'Racha', value: `${streak} ${streak === 1 ? 'día' : 'días'}` },
      ];
    }
    return [
      { label: 'Puertas', value: `${openWorlds}/${unlockableWorlds}` },
      { label: 'Toritos', value: toritos === null ? '–' : String(list.length) },
      { label: 'Racha', value: `${streak} ${streak === 1 ? 'día' : 'días'}` },
    ];
  }, [openWorlds, toritos, unlockableWorlds, world]);

  // Fuera de un mundo, el menú lleva al último que abrió o al que se puede abrir.
  const menuWorld: World =
    world ?? worldById(lastDoorId ?? TORITO_WORLD) ?? worldById(TORITO_WORLD)!;
  const tabs = useMemo(
    () => [
      { id: 'forest', label: 'Bosque', icon: <ForestIcon /> },
      { id: 'main', label: menuWorld.mainTab, icon: <DoorIcon /> },
      { id: 'scan', label: 'Escanear', icon: <ScanIcon />, isAccent: true },
      { id: 'shop', label: 'Tienda', icon: <ShopIcon /> },
      {
        id: 'profile',
        label: 'Perfil',
        icon: customer?.avatarUrl ? (
          <img className="liquid-avatar" src={customer.avatarUrl} alt="" />
        ) : (
          <ProfileIcon />
        ),
      },
    ],
    [customer?.avatarUrl, menuWorld],
  );
  const activeTab = isScanning ? 'scan' : route.view === 'world' ? 'main' : route.view;

  const selectTab = (id: string) => {
    if (id === 'scan') setIsScanning(true);
    else if (id === 'shop') openShop(null);
    else if (id === 'profile') go({ view: 'profile' });
    else if (id === 'forest') go({ view: 'forest' });
    else go({ view: 'world', id: menuWorld.id, tab: 'main' });
  };

  const Screen = world ? WORLD_SCREENS[world.id] : null;
  const needsSaving =
    world?.id === TORITO_WORLD && !customer && !isExample && pending !== null && !skipsSaving;

  // Guardar el torito es un paso aparte: hasta entonces la app no estorba.
  if (needsSaving && isReady) {
    return (
      <SavePrompt
        assetsPath="/torito"
        pending={pending}
        authError={authError}
        onSkip={() => setSkipsSaving(true)}
      />
    );
  }

  return (
    <div
      className="app-root"
      style={
        world
          ? ({
              '--world-bg': world.theme.bg,
              '--world-accent': world.theme.accent,
            } as React.CSSProperties)
          : undefined
      }
    >
      {isReady && !world && (
        <ForestExperience
          isOwner={isOwner}
          celebrates={celebrates}
          hasPending={pending !== null}
          startDoorId={lastDoorId}
          notice={notice}
          onCelebrated={() => setCelebrates(false)}
          onEnterWorld={(id) => go({ view: 'world', id, tab: 'main' })}
          onScan={() => setIsScanning(true)}
          onProfile={() => go({ view: 'profile' })}
          onShop={openShop}
        />
      )}

      {isReady && route.view === 'shop' && (
        <main className="app-world">
          <ShopScreen
            customer={customer}
            categoryPrefix={shopPrefix}
            onCompleteProfile={() => go({ view: 'profile' })}
          />
        </main>
      )}

      {isReady && route.view === 'profile' && (
        <main className="app-world">
          <ProfileScreen
            customer={customer}
            returnPath={appPath(route)}
            stats={stats}
            onCustomerChange={setCustomer}
            onOpenWorld={() => go({ view: 'world', id: TORITO_WORLD, tab: 'collection' })}
          />
        </main>
      )}

      {isReady && world && Screen && (
        <main className="app-world" key={world.id}>
          <Screen
            assetsPath="/torito"
            tab={route.view === 'world' ? route.tab : 'main'}
            customerName={customer?.name ?? null}
            toritos={toritos}
            pending={pending}
            persists={persists}
            focusId={claimedId ?? newToritoId}
            notice={notice}
            onScan={() => setIsScanning(true)}
            onProfile={() => go({ view: 'profile' })}
            onShop={() => openShop(world.shop?.categoryPrefix ?? null)}
            onToritoChange={(id, change) =>
              setToritos((current) =>
                current
                  ? current.map((item) => (item.id === id ? { ...item, ...change } : item))
                  : current,
              )
            }
          />
        </main>
      )}

      {isReady && (
        <>
          {(route.view === 'forest' || route.view === 'world') && (
            <header className="app-hud">
              <div className="app-hud-stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="app-stat">
                    <span className="app-stat-value">{stat.value}</span>
                    <span className="app-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
              {route.view === 'world' && world ? (
                <>
                  <h1 className="sr-only">{world.name}</h1>
                  <div className="app-segment" role="group" aria-label={world.name}>
                    {(
                      [
                        ['main', world.mainTab],
                        ['collection', world.collectionTab],
                      ] as const
                    ).map(([tab, label]) => (
                      <button
                        key={tab}
                        type="button"
                        className={route.tab === tab ? 'is-active' : undefined}
                        aria-pressed={route.tab === tab}
                        onClick={() => go({ view: 'world', id: world.id, tab })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <h1 className="app-hud-title">
                  <span className="rombo" aria-hidden="true" />
                  El bosque de las puertas
                </h1>
              )}
            </header>
          )}
          {route.view === 'shop' && <h1 className="sr-only">Tienda</h1>}
          {route.view === 'profile' && <h1 className="sr-only">Mi perfil</h1>}
          <LiquidTabBar tabs={tabs} activeId={activeTab} onSelect={selectTab} />
        </>
      )}

      {isScanning && <ScanSheet onClose={closeScan} />}

      {isLoaderMounted && <AppLoader world={world} progress={progress} isLeaving={isReady} />}
    </div>
  );
}
