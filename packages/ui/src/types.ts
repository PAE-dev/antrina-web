export interface NavLink {
  label: string;
  href: string;
}

export interface NavCategory extends NavLink {
  items: NavLink[];
  /** Enlace destacado en color de marca (p. ej. "Crea tu árbol"). */
  isHighlighted?: boolean;
}

export interface LocaleOption {
  code: string;
  label: string;
  href: string;
  isActive: boolean;
}

export interface HeaderLabels {
  search: string;
  searchPlaceholder: string;
  account: string;
  cart: string;
  openMenu: string;
  menuTitle: string;
  viewAll: string;
  home: string;
  language: string;
}

export interface CallToAction {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}
