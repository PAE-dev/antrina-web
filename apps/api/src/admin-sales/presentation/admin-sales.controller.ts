import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  type AdminPrincipal,
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
  type CreateOrderRequest,
  type CustomerDto,
  type CustomerListResponse,
  type DashboardDto,
  type OrderChannelCode,
  type OrderDto,
  type OrderListResponse,
  type OrderStatusCode,
  type UpdateOrderStatusRequest,
  type UpsertCustomerRequest,
} from '@antrina/contracts';
import {
  AdminOriginGuard,
  AdminSessionGuard,
  CurrentAdmin,
  RequirePermission,
} from '../../admin-auth/presentation/admin.guards.js';
import { parseBoolean, parsePositiveInt } from '../../shared/presentation/query-parsers.js';

function pagingQuery(page?: string, pageSize?: string) {
  const parsedPage = parsePositiveInt(page);
  const parsedPageSize = parsePositiveInt(pageSize);
  return {
    ...(parsedPage ? { page: parsedPage } : {}),
    ...(parsedPageSize ? { pageSize: parsedPageSize } : {}),
  };
}

@Controller('admin/dashboard')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('sales.manage')
export class AdminDashboardController {
  constructor(@Inject(GetDashboardUseCase) private readonly getDashboard: GetDashboardUseCase) {}

  @Get()
  dashboard(): Promise<DashboardDto> {
    return this.getDashboard.execute();
  }
}

@Controller('admin/orders')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('sales.manage')
export class AdminOrdersController {
  constructor(
    @Inject(ListOrdersUseCase) private readonly listOrders: ListOrdersUseCase,
    @Inject(GetOrderUseCase) private readonly getOrder: GetOrderUseCase,
    @Inject(CreateOrderUseCase) private readonly createOrder: CreateOrderUseCase,
    @Inject(UpdateOrderStatusUseCase) private readonly updateStatus: UpdateOrderStatusUseCase,
    @Inject(CancelOrderUseCase) private readonly cancelOrder: CancelOrderUseCase,
  ) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<OrderListResponse> {
    return this.listOrders.execute({
      ...(q ? { q } : {}),
      ...(status ? { status: status as OrderStatusCode } : {}),
      ...(channel ? { channel: channel as OrderChannelCode } : {}),
      ...(customerId ? { customerId } : {}),
      ...pagingQuery(page, pageSize),
    });
  }

  @Post()
  create(
    @Body() body: CreateOrderRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<OrderDto> {
    return this.createOrder.execute(body, admin.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.getOrder.execute(id);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<OrderDto> {
    return this.updateStatus.execute(id, body?.status, admin.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @CurrentAdmin() admin: AdminPrincipal): Promise<OrderDto> {
    return this.cancelOrder.execute(id, admin.id);
  }
}

@Controller('admin/customers')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('sales.manage')
export class AdminCustomersController {
  constructor(
    @Inject(ListCustomersUseCase) private readonly listCustomers: ListCustomersUseCase,
    @Inject(GetCustomerUseCase) private readonly getCustomer: GetCustomerUseCase,
    @Inject(CreateCustomerUseCase) private readonly createCustomer: CreateCustomerUseCase,
    @Inject(UpdateCustomerUseCase) private readonly updateCustomer: UpdateCustomerUseCase,
  ) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('withPhone') withPhone?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CustomerListResponse> {
    return this.listCustomers.execute({
      ...(q ? { q } : {}),
      ...(parseBoolean(withPhone) ? { withPhone: true } : {}),
      ...pagingQuery(page, pageSize),
    });
  }

  @Post()
  create(
    @Body() body: UpsertCustomerRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<CustomerDto> {
    return this.createCustomer.execute(body, admin.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CustomerDto> {
    return this.getCustomer.execute(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpsertCustomerRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<CustomerDto> {
    return this.updateCustomer.execute(id, body, admin.id);
  }
}
