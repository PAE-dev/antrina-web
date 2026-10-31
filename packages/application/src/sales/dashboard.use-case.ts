import {
  type DailyRevenueDto,
  type DashboardDto,
  type MoneyDto,
  type SalesTotalsDto,
  type StockAlertDto,
} from '@antrina/contracts';
import {
  type Clock,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  type OrderRepository,
  type Product,
  type ProductRepository,
  type SalesTotals,
} from '@antrina/domain';
import { toOrderDto } from './sales.mappers.js';

/** Perú no cambia de hora: los días y meses del resumen son siempre UTC−5. */
const LIMA_OFFSET_MINUTES = -5 * 60;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const CHART_DAYS = 30;
const TOP_PRODUCTS = 5;
const STOCK_ALERTS = 8;
const RECENT_ORDERS = 6;

const money = (amount: number): MoneyDto => ({ amount, currency: DEFAULT_CURRENCY });

const toTotalsDto = (totals: SalesTotals): SalesTotalsDto => ({
  orderCount: totals.orderCount,
  unitCount: totals.unitCount,
  revenue: money(totals.revenueCents),
});

const toStockAlert = (product: Product): StockAlertDto => ({
  productId: product.id,
  name: product.contentFor(DEFAULT_LOCALE).name,
  sku: product.sku,
  stock: product.stock,
  lowStockThreshold: product.lowStockThreshold,
});

/** Convierte un instante a un `Date` cuyos campos UTC son la hora civil de Lima. */
const toLimaClock = (instant: Date) =>
  new Date(instant.getTime() + LIMA_OFFSET_MINUTES * MINUTE_MS);

/** Inverso de `toLimaClock`: de hora civil de Lima (en campos UTC) al instante real. */
const fromLimaClock = (civil: number) => new Date(civil - LIMA_OFFSET_MINUTES * MINUTE_MS);

const dayKey = (civil: Date) => civil.toISOString().slice(0, 10);

/** Inicio de hoy, del mes y del mes anterior en Lima, y la serie de los últimos días. */
export function limaPeriods(now: Date) {
  const civil = toLimaClock(now);
  const year = civil.getUTCFullYear();
  const month = civil.getUTCMonth();
  const todayCivil = Date.UTC(year, month, civil.getUTCDate());
  const chartStartCivil = todayCivil - (CHART_DAYS - 1) * DAY_MS;
  return {
    today: fromLimaClock(todayCivil),
    month: fromLimaClock(Date.UTC(year, month, 1)),
    previousMonth: fromLimaClock(Date.UTC(year, month - 1, 1)),
    chartStart: fromLimaClock(chartStartCivil),
    chartDays: Array.from({ length: CHART_DAYS }, (_, index) =>
      dayKey(new Date(chartStartCivil + index * DAY_MS)),
    ),
  };
}

export class GetDashboardUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<DashboardDto> {
    const now = this.clock.now();
    const periods = limaPeriods(now);
    const [today, month, previousMonth, daily, top, pending, recent, inventory, out, low] =
      await Promise.all([
        this.orders.totals({ from: periods.today, to: now }),
        this.orders.totals({ from: periods.month, to: now }),
        this.orders.totals({ from: periods.previousMonth, to: periods.month }),
        this.orders.dailyRevenue({ from: periods.chartStart, to: now }, LIMA_OFFSET_MINUTES),
        this.orders.topProducts({ from: periods.month, to: now }, TOP_PRODUCTS),
        this.orders.list({ status: 'PENDING', limit: 1, offset: 0 }),
        this.orders.list({ limit: RECENT_ORDERS, offset: 0 }),
        this.products.inventorySummary(),
        this.products.findManyForAdmin({ stock: 'out', limit: STOCK_ALERTS, offset: 0 }),
        this.products.findManyForAdmin({ stock: 'low', limit: STOCK_ALERTS, offset: 0 }),
      ]);

    const byDay = new Map(daily.map((row) => [row.day, row]));
    const last30Days: DailyRevenueDto[] = periods.chartDays.map((day) => ({
      day,
      revenue: money(byDay.get(day)?.revenueCents ?? 0),
      orderCount: byDay.get(day)?.orderCount ?? 0,
    }));

    return {
      today: toTotalsDto(today),
      month: toTotalsDto(month),
      previousMonth: toTotalsDto(previousMonth),
      pendingOrderCount: pending.total,
      last30Days,
      topProducts: top.map((row) => ({
        productId: row.productId,
        name: row.name,
        sku: row.sku,
        unitCount: row.unitCount,
        revenue: money(row.revenueCents),
      })),
      stockAlerts: [...out.items, ...low.items].slice(0, STOCK_ALERTS).map(toStockAlert),
      recentOrders: recent.items.map(toOrderDto),
      inventory: {
        activeProducts: inventory.activeProducts,
        lowStockCount: inventory.lowStockCount,
        outOfStockCount: inventory.outOfStockCount,
        unitsInStock: inventory.unitsInStock,
        stockCost: money(inventory.stockCostCents),
      },
    };
  }
}
