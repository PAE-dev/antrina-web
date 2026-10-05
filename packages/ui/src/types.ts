export interface NavLink {
  label: string;
  href: string;
  /** Dato secundario en mono (piedras, fechas) para los menús desplegables. */
  detail?: string;
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

/** Foto lista para `<img>`: la app decide URLs optimizadas (`srcSet`) y el texto alternativo. */
export interface ImageSource {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width?: number;
  height?: number;
}

export type ImageLoader = (url: string) => { src: string; srcSet?: string; sizes?: string };

export interface CallToAction {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}
