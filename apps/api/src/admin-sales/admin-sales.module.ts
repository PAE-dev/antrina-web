import { Module } from '@nestjs/common';
import {
  CancelOrderUseCase,
  CreateCustomerUseCase,
  CreateOrderUseCase,
  GetCustomerUseCase,
  GetDashboardUseCase,
  GetOrderUseCase,
  ListCustomersUseCase,
  ListOrdersUseCase,
  UpdateCustomerUseCase,
  UpdateOrderStatusUseCase,
} from '@antrina/application';
import {
  type AuditLog,
  type Clock,
  type CustomerRepository,
  type OrderRepository,
  type ProductRepository,
} from '@antrina/domain';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { AUDIT_LOG, CLOCK } from '../admin-auth/admin-auth.tokens.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { PRODUCT_REPOSITORY } from '../catalog/catalog.tokens.js';
import { CUSTOMER_REPOSITORY, ORDER_REPOSITORY } from './admin-sales.tokens.js';
import { PrismaCustomerRepository } from './infrastructure/prisma-customer.repository.js';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository.js';
import {
  AdminCustomersController,
  AdminDashboardController,
  AdminOrdersController,
} from './presentation/admin-sales.controller.js';

const orderAuditUseCase = <T>(UseCase: new (orders: OrderRepository, audit: AuditLog) => T) => ({
  provide: UseCase,
  useFactory: (orders: OrderRepository, audit: AuditLog) => new UseCase(orders, audit),
  inject: [ORDER_REPOSITORY, AUDIT_LOG],
});

const customerAuditUseCase = <T>(
  UseCase: new (customers: CustomerRepository, audit: AuditLog) => T,
) => ({
  provide: UseCase,
  useFactory: (customers: CustomerRepository, audit: AuditLog) => new UseCase(customers, audit),
  inject: [CUSTOMER_REPOSITORY, AUDIT_LOG],
});

/** Ventas registradas desde el panel, clientes y resumen del negocio. */
@Module({
  imports: [AdminAuthModule, CatalogModule],
  controllers: [AdminDashboardController, AdminOrdersController, AdminCustomersController],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    {
      provide: CreateOrderUseCase,
      useFactory: (orders: OrderRepository, audit: AuditLog, clock: Clock) =>
        new CreateOrderUseCase(orders, audit, clock),
      inject: [ORDER_REPOSITORY, AUDIT_LOG, CLOCK],
    },
    {
      provide: ListOrdersUseCase,
      useFactory: (orders: OrderRepository) => new ListOrdersUseCase(orders),
      inject: [ORDER_REPOSITORY],
    },
    {
      provide: GetOrderUseCase,
      useFactory: (orders: OrderRepository) => new GetOrderUseCase(orders),
      inject: [ORDER_REPOSITORY],
    },
    orderAuditUseCase(UpdateOrderStatusUseCase),
    orderAuditUseCase(CancelOrderUseCase),
    {
      provide: ListCustomersUseCase,
      useFactory: (customers: CustomerRepository) => new ListCustomersUseCase(customers),
      inject: [CUSTOMER_REPOSITORY],
    },
    {
      provide: GetCustomerUseCase,
      useFactory: (customers: CustomerRepository) => new GetCustomerUseCase(customers),
      inject: [CUSTOMER_REPOSITORY],
    },
    customerAuditUseCase(CreateCustomerUseCase),
    customerAuditUseCase(UpdateCustomerUseCase),
    {
      provide: GetDashboardUseCase,
      useFactory: (orders: OrderRepository, products: ProductRepository, clock: Clock) =>
        new GetDashboardUseCase(orders, products, clock),
      inject: [ORDER_REPOSITORY, PRODUCT_REPOSITORY, CLOCK],
    },
  ],
})
export class AdminSalesModule {}
