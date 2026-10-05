import { Accordion, Badge, Button, Drawer, Modal, Popover, SearchField } from '@heroui/react';
import { useEffect, useState } from 'react';
import { ArrowRightIcon, BagIcon, ChevronDownIcon, MenuIcon, SearchIcon, UserIcon } from './icons';
import { Logo } from './Logo';
import { type HeaderLabels, type LocaleOption, type NavCategory } from './types';

interface SiteHeaderProps {
  homeHref: string;
  searchAction: string;
  accountHref: string;
  cartHref: string;
  cartCount: number;
  navigation: NavCategory[];
  locales: LocaleOption[];
  labels: HeaderLabels;
}

/** A partir de este índice los enlaces simples solo caben en escritorio ancho. */
const WIDE_ONLY_FROM = 5;

export function SiteHeader({
  homeHref,
  searchAction,
  accountHref,
  cartHref,
  cartCount,
  navigation,
  locales,
  labels,
}: SiteHeaderProps) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const isScrolled = useIsScrolled(8);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        isScrolled ? 'header-glass border-border' : 'border-transparent bg-bg'
      }`}
    >
      <div className="container-page grid h-16 grid-cols-[1fr_auto] items-center gap-6 md:h-[72px] lg:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-1">
          <MobileMenu
            navigation={navigation}
            locales={locales}
            labels={labels}
            homeHref={homeHref}
          />
          <Logo href={homeHref} label={labels.home} />
        </div>

        <nav aria-label={labels.menuTitle} className="hidden justify-center lg:flex">
          <ul className="flex items-center gap-0.5">
            {navigation.map((item, index) => (
              <li
                key={item.href}
                className={
                  index >= WIDE_ONLY_FROM && item.items.length === 0 ? 'hidden xl:block' : ''
                }
              >
                <NavEntry item={item} viewAllLabel={labels.viewAll} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-0.5">
          <Button
            isIconOnly
            variant="ghost"
            aria-label={labels.search}
            className="text-text"
            onPress={() => setSearchOpen(true)}
          >
            <SearchIcon />
          </Button>
          <a
            href={accountHref}
            aria-label={labels.account}
            className="hidden size-10 items-center justify-center rounded-full text-text transition-colors hover:bg-bg-alt sm:inline-flex"
          >
            <UserIcon />
          </a>
          <a
            href={cartHref}
            aria-label={`${labels.cart} (${cartCount})`}
            className="inline-flex size-10 items-center justify-center rounded-full text-text transition-colors hover:bg-bg-alt"
          >
            <Badge.Anchor>
              <BagIcon />
              {cartCount > 0 && (
                <Badge color="accent" size="sm">
                  {cartCount}
                </Badge>
              )}
            </Badge.Anchor>
          </a>
        </div>
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onOpenChange={setSearchOpen}
        action={searchAction}
        labels={labels}
      />
    </header>
  );
}

function useIsScrolled(threshold: number): boolean {
  const [isScrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);

  return isScrolled;
}

const navItemClass =
  'type-menu inline-flex h-9 items-center gap-1 rounded-full px-3 text-text transition-colors hover:bg-bg-alt';

function NavEntry({ item, viewAllLabel }: { item: NavCategory; viewAllLabel: string }) {
  if (item.items.length === 0) {
    if (item.isHighlighted) {
      return (
        <a href={item.href} className={`${navItemClass} gap-2 text-brand hover:bg-brand-tint`}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-clay" />
          {item.label}
        </a>
      );
    }
    return (
      <a href={item.href} className={navItemClass}>
        {item.label}
      </a>
    );
  }

  const hasDetails = item.items.some((child) => child.detail);
  const columns =
    item.items.length > 8 ? 'grid-cols-3' : hasDetails ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <Popover>
      <Button
        variant="ghost"
        className={`${navItemClass} h-9 aria-expanded:bg-bg-alt [&[aria-expanded=true]>svg]:rotate-180`}
      >
        {item.label}
        <ChevronDownIcon className="transition-transform duration-200" />
      </Button>
      <Popover.Content placement="bottom" offset={14} className="rounded-md p-0">
        <Popover.Dialog aria-label={item.label} className="p-2 outline-none">
          <ul className={`grid gap-0.5 ${columns} ${columns === 'grid-cols-1' ? 'w-56' : ''}`}>
            {item.items.map((child) => (
              <li key={child.href}>
                <a
                  href={child.href}
                  className="flex min-w-44 flex-col gap-0.5 rounded-sm px-3 py-2.5 transition-colors hover:bg-bg-alt"
                >
                  <span className="text-[14.5px] font-medium tracking-[-0.01em] text-text">
                    {child.label}
                  </span>{' '}
                  {child.detail && <span className="type-label">{child.detail}</span>}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={item.href}
            className="mt-2 flex items-center justify-between gap-4 border-t border-border px-3 pb-1 pt-3 text-[13.5px] font-medium text-brand"
          >
            {viewAllLabel}
            <ArrowRightIcon />
          </a>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function SearchModal({
  isOpen,
  onOpenChange,
  action,
  labels,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  labels: HeaderLabels;
}) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" placement="top">
        <Modal.Dialog aria-label={labels.search} className="p-3">
          <form action={action} method="get" role="search">
            <SearchField name="q" aria-label={labels.search} autoFocus fullWidth>
              <SearchField.Group className="h-12">
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={labels.searchPlaceholder} className="text-[16px]" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function MobileMenu({
  navigation,
  locales,
  labels,
  homeHref,
}: {
  navigation: NavCategory[];
  locales: LocaleOption[];
  labels: HeaderLabels;
  homeHref: string;
}) {
  const groups = navigation.filter((item) => item.items.length > 0);
  const links = navigation.filter((item) => item.items.length === 0);

  return (
    <Drawer>
      <Button
        isIconOnly
        variant="ghost"
        aria-label={labels.openMenu}
        className="-ml-2 text-text lg:hidden"
      >
        <MenuIcon />
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="left">
          <Drawer.Dialog aria-label={labels.menuTitle} className="w-[min(380px,90vw)] bg-bg">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="sr-only">{labels.menuTitle}</Drawer.Heading>
              <Logo href={homeHref} label={labels.home} />
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-8">
              <Accordion className="border-y border-border">
                {groups.map((group) => (
                  <Accordion.Item key={group.href} id={group.href}>
                    <Accordion.Heading>
                      <Accordion.Trigger className="px-0 py-4 text-[17px] font-medium tracking-[-0.015em] text-text">
                        {group.label}
                        <Accordion.Indicator />
                      </Accordion.Trigger>
                    </Accordion.Heading>
                    <Accordion.Panel>
                      <Accordion.Body className="px-0 pb-4 pt-0">
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
                          {group.items.map((child) => (
                            <li key={child.href}>
                              <a href={child.href} className="flex flex-col">
                                <span className="text-[15px] text-text">{child.label}</span>{' '}
                                {child.detail && (
                                  <span className="type-label text-[11.5px]">{child.detail}</span>
                                )}
                              </a>
                            </li>
                          ))}
                          <li className="col-span-2">
                            <a
                              href={group.href}
                              className="inline-flex items-center gap-2 text-[14px] font-medium text-brand"
                            >
                              {labels.viewAll}
                              <ArrowRightIcon />
                            </a>
                          </li>
                        </ul>
                      </Accordion.Body>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
              <ul className="flex flex-col gap-4">
                {links.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={`text-[17px] font-medium tracking-[-0.015em] ${
                        item.isHighlighted ? 'text-brand' : 'text-text'
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <nav
                aria-label={labels.language}
                className="mt-auto flex gap-2 font-mono text-[13px]"
              >
                {locales.map((locale) => (
                  <a
                    key={locale.code}
                    href={locale.href}
                    hrefLang={locale.code}
                    aria-current={locale.isActive ? 'true' : undefined}
                    className={`rounded-sm px-2 py-1 ${
                      locale.isActive ? 'bg-text text-on-dark' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {locale.label}
                  </a>
                ))}
              </nav>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
