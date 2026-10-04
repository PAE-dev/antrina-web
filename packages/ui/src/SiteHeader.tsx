import { Button, Drawer, Dropdown, SearchField } from '@heroui/react';
import { useEffect, useState } from 'react';
import { BagIcon, ChevronDownIcon, MenuIcon, SearchIcon, UserIcon } from './icons';
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

const COMPACT_AFTER_PX = 64;

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
  const isCompact = useIsScrolled(COMPACT_AFTER_PX);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div
        className={`container-page grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-300 ${
          isCompact ? 'h-14 md:h-16' : 'h-20 md:h-24'
        }`}
      >
        <div className="flex items-center gap-1">
          <MobileMenu
            navigation={navigation}
            locales={locales}
            labels={labels}
            homeHref={homeHref}
          />
          <Button
            isIconOnly
            variant="ghost"
            aria-label={labels.search}
            aria-expanded={isSearchOpen}
            className="text-text"
            onPress={() => setSearchOpen((open) => !open)}
          >
            <SearchIcon />
          </Button>
        </div>

        <Logo href={homeHref} label={labels.home} isCompact={isCompact} />

        <div className="flex items-center justify-end gap-1">
          <a
            href={accountHref}
            aria-label={labels.account}
            className="hidden size-10 items-center justify-center text-text transition-colors hover:text-brand sm:inline-flex"
          >
            <UserIcon />
          </a>
          <a
            href={cartHref}
            aria-label={`${labels.cart} (${cartCount})`}
            className="inline-flex h-10 min-w-10 items-center justify-center gap-1 text-text transition-colors hover:text-brand"
          >
            <BagIcon />
            {cartCount > 0 && <span className="text-[12px] font-medium">{cartCount}</span>}
          </a>
        </div>
      </div>

      {isSearchOpen && (
        <form
          action={searchAction}
          method="get"
          role="search"
          className="container-page measure pb-5"
        >
          <SearchField name="q" aria-label={labels.search} autoFocus fullWidth>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={labels.searchPlaceholder} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </form>
      )}

      <nav aria-label={labels.menuTitle} className="hidden border-t border-border lg:block">
        <ul
          className={`container-page flex items-center justify-center gap-2 transition-[height] duration-300 xl:gap-5 ${
            isCompact ? 'h-10' : 'h-12'
          }`}
        >
          {navigation.map((item) => (
            <li key={item.href}>
              <NavEntry item={item} viewAllLabel={labels.viewAll} />
            </li>
          ))}
        </ul>
      </nav>
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

const navItemClass = 'type-menu inline-flex h-9 items-center gap-1 px-2 transition-colors';

function NavEntry({ item, viewAllLabel }: { item: NavCategory; viewAllLabel: string }) {
  if (item.items.length === 0) {
    return (
      <a
        href={item.href}
        className={`${navItemClass} ${item.isHighlighted ? 'text-brand hover:text-brand-hover' : 'text-text hover:text-brand'}`}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Dropdown>
      <Dropdown.Trigger
        className={`${navItemClass} cursor-pointer text-text outline-none hover:text-brand aria-expanded:text-brand data-[focus-visible]:outline-2 data-[focus-visible]:outline-brand`}
      >
        {item.label}
        <ChevronDownIcon />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom" className="min-w-60 rounded-sm border border-border">
        <Dropdown.Menu aria-label={item.label} className="max-h-[70vh] overflow-y-auto">
          {item.items.map((child) => (
            <Dropdown.Item
              key={child.href}
              id={child.href}
              href={child.href}
              textValue={child.label}
              className="type-menu"
            >
              {child.label}
            </Dropdown.Item>
          ))}
          <Dropdown.Item
            id={`${item.href}#all`}
            href={item.href}
            textValue={viewAllLabel}
            className="type-menu text-brand"
          >
            {viewAllLabel}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
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
  return (
    <Drawer>
      <Button
        isIconOnly
        variant="ghost"
        aria-label={labels.openMenu}
        className="text-text lg:hidden"
      >
        <MenuIcon />
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="left">
          <Drawer.Dialog aria-label={labels.menuTitle} className="bg-bg">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="type-h3">{labels.menuTitle}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <ul className="flex flex-col divide-y divide-border border-y border-border">
                <li>
                  <a href={homeHref} className="type-menu block py-4 text-text">
                    {labels.home}
                  </a>
                </li>
                {navigation.map((item) => (
                  <li key={item.href} className="py-4">
                    <a
                      href={item.href}
                      className={`type-menu block ${item.isHighlighted ? 'text-brand' : 'text-text'}`}
                    >
                      {item.label}
                    </a>
                    {item.items.length > 0 && (
                      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 pl-3 text-[14px] text-text-secondary">
                        {item.items.map((child) => (
                          <li key={child.href}>
                            <a href={child.href} className="hover:text-brand">
                              {child.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <nav aria-label={labels.language} className="mt-6 flex gap-4">
                {locales.map((locale) => (
                  <a
                    key={locale.code}
                    href={locale.href}
                    hrefLang={locale.code}
                    aria-current={locale.isActive ? 'true' : undefined}
                    className={`type-button ${locale.isActive ? 'text-brand' : 'text-text-muted hover:text-text'}`}
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
