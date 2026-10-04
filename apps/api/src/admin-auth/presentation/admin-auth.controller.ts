import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  type AdminPrincipal,
  ConfirmTotpEnrollmentUseCase,
  GetCurrentAdminUseCase,
  type IssuedSession,
  LoginUseCase,
  LogoutUseCase,
  StartTotpEnrollmentUseCase,
  VerifyTotpUseCase,
} from '@antrina/application';
import {
  type AdminLoginRequest,
  type AdminLoginResponse,
  type AdminMeDto,
  type AdminTotpCodeRequest,
  type AdminTotpSetupDto,
} from '@antrina/contracts';
import { type Request, type Response } from 'express';
import { APP_ENV, type AppEnv } from '../../config/env.js';
import { AdminOriginGuard, AdminSessionGuard, CurrentAdmin } from './admin.guards.js';
import {
  clearSessionCookie,
  readSessionToken,
  requestContext,
  setSessionCookie,
} from './admin-session.cookie.js';

/** 10 intentos por minuto e IP en los pasos que aceptan secretos. */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

function toMeDto(principal: AdminPrincipal): AdminMeDto {
  return { id: principal.id, email: principal.email, name: principal.name, role: principal.role };
}

@Controller('admin/auth')
@UseGuards(AdminOriginGuard, ThrottlerGuard)
export class AdminAuthController {
  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(LoginUseCase) private readonly login: LoginUseCase,
    @Inject(VerifyTotpUseCase) private readonly verifyTotp: VerifyTotpUseCase,
    @Inject(StartTotpEnrollmentUseCase)
    private readonly startEnrollment: StartTotpEnrollmentUseCase,
    @Inject(ConfirmTotpEnrollmentUseCase)
    private readonly confirmEnrollment: ConfirmTotpEnrollmentUseCase,
    @Inject(LogoutUseCase) private readonly logout: LogoutUseCase,
    @Inject(GetCurrentAdminUseCase) private readonly currentAdmin: GetCurrentAdminUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async signIn(
    @Body() body: AdminLoginRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminLoginResponse> {
    const result = await this.login.execute({
      email: body?.email,
      password: body?.password,
      ...requestContext(request),
    });
    setSessionCookie(response, result.sessionToken, result.expiresAt, this.env.isProduction);
    return { status: result.status };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async verify(
    @Body() body: AdminTotpCodeRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminMeDto> {
    const session = await this.verifyTotp.execute({
      sessionToken: readSessionToken(request),
      code: body?.code,
      ...requestContext(request),
    });
    return this.completeSignIn(session, response);
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  setup(@Req() request: Request): Promise<AdminTotpSetupDto> {
    return this.startEnrollment.execute({ sessionToken: readSessionToken(request) });
  }

  @Post('mfa/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async confirm(
    @Body() body: AdminTotpCodeRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminMeDto> {
    const session = await this.confirmEnrollment.execute({
      sessionToken: readSessionToken(request),
      code: body?.code,
      ...requestContext(request),
    });
    return this.completeSignIn(session, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logout.execute({ sessionToken: readSessionToken(request) });
    clearSessionCookie(response, this.env.isProduction);
  }

  @Get('me')
  @UseGuards(AdminSessionGuard)
  me(@CurrentAdmin() admin: AdminPrincipal): AdminMeDto {
    return toMeDto(admin);
  }

  private async completeSignIn(session: IssuedSession, response: Response): Promise<AdminMeDto> {
    setSessionCookie(response, session.sessionToken, session.expiresAt, this.env.isProduction);
    return toMeDto(await this.currentAdmin.execute({ sessionToken: session.sessionToken }));
  }
}
