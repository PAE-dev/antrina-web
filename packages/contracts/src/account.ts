import { type MoneyDto } from './common.js';

/** Cuenta de cliente (acceso con Google). Una sola sesión para todo el sitio. */

export const ACCOUNT_ROUTES = {
  /** Redirige a Google. `?returnTo=/ruta` vuelve ahí al terminar. */
  googleStart: '/auth/google',
  googleCallback: '/auth/google/callback',
  logout: '/auth/logout',
  me: '/me',
  sky: '/me/sky',
  skyQuestions: '/me/sky/questions',
  skyBonds: '/me/sky/bonds',
  skyBond: (id: string) => `/me/sky/bonds/${encodeURIComponent(id)}`,
  orders: '/me/orders',
} as const;

export interface AccountDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** Tiene compras enlazadas (cliente de ventas con su correo). */
  hasPurchases: boolean;
}

/** `account` es null si no hay sesión (la respuesta siempre es 200). */
export interface MeResponse {
  account: AccountDto | null;
  /** Hay acceso con Google configurado en el servidor. */
  googleEnabled: boolean;
}

export interface SkyPlaceDto {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface SkyProfileDto {
  birthDate: string;
  birthTime: string | null;
  place: SkyPlaceDto | null;
}

export type SkyTopicCode = 'self' | 'love' | 'work' | 'money';

export interface SkyQuestionDto {
  id: string;
  question: string;
  topic: SkyTopicCode;
  day: string;
}

export interface SkyBondDto {
  id: string;
  name: string;
  birthDate: string;
}

export interface SkyDataResponse {
  profile: SkyProfileDto | null;
  questions: SkyQuestionDto[];
  bonds: SkyBondDto[];
}

export type SaveSkyProfileRequest = SkyProfileDto;

export interface AddSkyQuestionRequest {
  question: string;
  topic: SkyTopicCode;
  day: string;
}

export interface AddSkyBondRequest {
  name: string;
  birthDate: string;
}

export interface MyOrderLineDto {
  name: string;
  quantity: number;
  unitPrice: MoneyDto;
}

export type MyOrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface MyOrderDto {
  number: number;
  status: MyOrderStatus;
  soldAt: string;
  total: MoneyDto;
  lines: MyOrderLineDto[];
}

export interface MyOrdersResponse {
  data: MyOrderDto[];
}
