import { type CurrencyCode, type MoneyDto } from './common.js';

export type OrderStatusCode = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type OrderChannelCode =
  'WHATSAPP' | 'STORE' | 'INSTAGRAM' | 'FACEBOOK' | 'IN_PERSON' | 'OTHER';

export type PaymentMethodCode = 'YAPE' | 'PLIN' | 'TRANSFER' | 'CASH' | 'CARD' | 'OTHER';

export interface CustomerDto {
  id: string;
  name: string;
  /** E.164, p. ej. +51987654321. */
  phone: string | null;
  email: string | null;
  note: string | null;
  /** Se registró en la tienda; entonces `createdAt` es su fecha de registro. */
  hasWebAccount: boolean;
  lastLoginAt: string | null;
  orderCount: number;
  totalSpent: MoneyDto;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface CustomerListQuery {
  q?: string;
  withPhone?: boolean;
  webAccount?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CustomerListResponse {
  data: CustomerDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpsertCustomerRequest {
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
}

export interface OrderCustomerDto {
  id: string;
  name: string;
  phone: string | null;
}

export interface OrderLineDto {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: MoneyDto;
  lineTotal: MoneyDto;
}

export interface OrderDto {
  id: string;
  number: number;
  status: OrderStatusCode;
  channel: OrderChannelCode;
  paymentMethod: PaymentMethodCode | null;
  customer: OrderCustomerDto | null;
  lines: OrderLineDto[];
  unitCount: number;
  subtotal: MoneyDto;
  shipping: MoneyDto;
  discount: MoneyDto;
  total: MoneyDto;
  note: string | null;
  soldAt: string;
  createdByName: string | null;
  createdAt: string;
}

export interface OrderListQuery {
  q?: string;
  status?: OrderStatusCode;
  channel?: OrderChannelCode;
  customerId?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderListResponse {
  data: OrderDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderRequest {
  /** Una venta nace sin cancelar. */
  status: Exclude<OrderStatusCode, 'CANCELLED'>;
  channel: OrderChannelCode;
  paymentMethod: PaymentMethodCode | null;
  /** Cliente ya existente. Tiene prioridad sobre `customer`. */
  customerId: string | null;
  /** Cliente nuevo; si el teléfono ya existe se reutiliza. Ambos null = venta sin cliente. */
  customer: UpsertCustomerRequest | null;
  currency: CurrencyCode;
  lines: { productId: string; quantity: number; unitPriceCents: number }[];
  shippingCents: number;
  discountCents: number;
  note: string | null;
  /** ISO 8601. Por defecto, ahora. */
  soldAt: string | null;
}

export interface UpdateOrderStatusRequest {
  status: Exclude<OrderStatusCode, 'CANCELLED'>;
}

export interface SalesTotalsDto {
  orderCount: number;
  unitCount: number;
  revenue: MoneyDto;
}

export interface DailyRevenueDto {
  /** Día en Lima, formato YYYY-MM-DD. */
  day: string;
  revenue: MoneyDto;
  orderCount: number;
}

export interface TopProductDto {
  productId: string;
  name: string;
  sku: string;
  unitCount: number;
  revenue: MoneyDto;
}

export interface StockAlertDto {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
}

export interface InventorySummaryDto {
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  unitsInStock: number;
  /** Solo productos con costo registrado. */
  stockCost: MoneyDto;
}

export interface DashboardDto {
  today: SalesTotalsDto;
  month: SalesTotalsDto;
  previousMonth: SalesTotalsDto;
  pendingOrderCount: number;
  /** Últimos 30 días incluyendo hoy, con los días sin ventas en cero. */
  last30Days: DailyRevenueDto[];
  topProducts: TopProductDto[];
  stockAlerts: StockAlertDto[];
  recentOrders: OrderDto[];
  inventory: InventorySummaryDto;
}

export const ADMIN_SALES_ROUTES = {
  dashboard: '/admin/dashboard',
  orders: '/admin/orders',
  order: (id: string) => `/admin/orders/${id}`,
  orderStatus: (id: string) => `/admin/orders/${id}/status`,
  cancelOrder: (id: string) => `/admin/orders/${id}/cancel`,
  customers: '/admin/customers',
  customer: (id: string) => `/admin/customers/${id}`,
} as const;
