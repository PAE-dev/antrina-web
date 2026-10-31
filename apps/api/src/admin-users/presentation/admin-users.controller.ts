import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  type AdminPrincipal,
  ChangeOwnPasswordUseCase,
  CreateManagedAdminUserUseCase,
  GetAdminUserUseCase,
  ListAdminUsersUseCase,
  ResetAdminPasswordUseCase,
  UpdateAdminUserUseCase,
} from '@antrina/application';
import {
  type AdminUserDto,
  type AdminUserListResponse,
  type ChangeOwnPasswordRequest,
  type CreateAdminUserRequest,
  type ResetAdminPasswordRequest,
  type UpdateAdminUserRequest,
} from '@antrina/contracts';
import {
  AdminOriginGuard,
  AdminSessionGuard,
  AuthRateLimitGuard,
  CurrentAdmin,
  RequirePermission,
} from '../../admin-auth/presentation/admin.guards.js';

@Controller('admin/users')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('admins.manage')
export class AdminUsersController {
  constructor(
    @Inject(ListAdminUsersUseCase) private readonly listUsers: ListAdminUsersUseCase,
    @Inject(GetAdminUserUseCase) private readonly getUser: GetAdminUserUseCase,
    @Inject(CreateManagedAdminUserUseCase)
    private readonly createUser: CreateManagedAdminUserUseCase,
    @Inject(UpdateAdminUserUseCase) private readonly updateUser: UpdateAdminUserUseCase,
    @Inject(ResetAdminPasswordUseCase) private readonly resetPassword: ResetAdminPasswordUseCase,
  ) {}

  @Get()
  list(): Promise<AdminUserListResponse> {
    return this.listUsers.execute();
  }

  @Post()
  create(
    @Body() body: CreateAdminUserRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminUserDto> {
    return this.createUser.execute(body, admin.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<AdminUserDto> {
    return this.getUser.execute(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateAdminUserRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminUserDto> {
    return this.updateUser.execute(id, body, admin.id);
  }

  @Put(':id/password')
  setPassword(
    @Param('id') id: string,
    @Body() body: ResetAdminPasswordRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminUserDto> {
    return this.resetPassword.execute(id, body, admin.id);
  }
}

@Controller('admin/account')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
export class AdminAccountController {
  constructor(
    @Inject(ChangeOwnPasswordUseCase) private readonly changePassword: ChangeOwnPasswordUseCase,
  ) {}

  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthRateLimitGuard)
  password(
    @Body() body: ChangeOwnPasswordRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<void> {
    return this.changePassword.execute(body, { id: admin.id, sessionId: admin.sessionId });
  }
}
