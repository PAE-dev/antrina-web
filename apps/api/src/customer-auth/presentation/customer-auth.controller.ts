import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  CompleteGoogleSignInUseCase,
  CustomerLogoutUseCase,
  GetCurrentCustomerUseCase,
  RemoveCustomerAvatarUseCase,
  SetCustomerAvatarUseCase,
  StartGoogleSignInUseCase,
  UpdateCustomerProfileUseCase,
} from '@antrina/application';
import {
  CUSTOMER_AUTH_ROUTES,
  type CustomerAuthError,
  type CustomerMeDto,
} from '@antrina/contracts';
import { DomainError } from '@antrina/domain';
import { type Request, type Response } from 'express';
import { APP_ENV, type AppEnv } from '../../config/env.js';
import { CustomerOriginGuard } from './customer-origin.guard.js';
import {
  clearCustomerSessionCookies,
  clearOAuthCookie,
  readCustomerSessionToken,
  readOAuthCookie,
  safeNextPath,
  setCustomerSessionCookies,
  setOAuthCookie,
  withAuthError,
} from './customer-session.cookie.js';

function authErrorFor(error: unknown): CustomerAuthError {
  if (!(error instanceof DomainError)) throw error;
  return error.code === 'auth.google_unavailable' ? 'unavailable' : 'failed';
}

/** La tienda reenvía estas rutas desde su propio dominio para que la cookie sea de primera parte. */
@Controller()
export class CustomerAuthController {
  constructor(
    @Inject(StartGoogleSignInUseCase) private readonly startSignIn: StartGoogleSignInUseCase,
    @Inject(CompleteGoogleSignInUseCase)
    private readonly completeSignIn: CompleteGoogleSignInUseCase,
    @Inject(GetCurrentCustomerUseCase) private readonly currentCustomer: GetCurrentCustomerUseCase,
    @Inject(CustomerLogoutUseCase) private readonly logoutCustomer: CustomerLogoutUseCase,
    @Inject(UpdateCustomerProfileUseCase)
    private readonly updateProfile: UpdateCustomerProfileUseCase,
    @Inject(SetCustomerAvatarUseCase) private readonly setAvatar: SetCustomerAvatarUseCase,
    @Inject(RemoveCustomerAvatarUseCase) private readonly removeAvatar: RemoveCustomerAvatarUseCase,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Get(CUSTOMER_AUTH_ROUTES.googleStart)
  startGoogle(@Query('next') nextParam: unknown, @Res() response: Response): void {
    const next = safeNextPath(nextParam);
    try {
      const { url, state, nonce, codeVerifier } = this.startSignIn.execute();
      setOAuthCookie(response, { state, nonce, codeVerifier, next }, this.env.isProduction);
      response.redirect(HttpStatus.FOUND, url);
    } catch (error) {
      response.redirect(HttpStatus.FOUND, withAuthError(next, authErrorFor(error)));
    }
  }

  @Get(CUSTOMER_AUTH_ROUTES.googleCallback)
  async googleCallback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') googleError: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const pending = readOAuthCookie(request);
    const next = safeNextPath(pending?.next);
    clearOAuthCookie(response, this.env.isProduction);

    if (googleError === 'access_denied') {
      response.redirect(HttpStatus.FOUND, withAuthError(next, 'cancelled'));
      return;
    }
    try {
      const result = await this.completeSignIn.execute({
        code: typeof code === 'string' ? code : '',
        state: typeof state === 'string' ? state : '',
        expectedState: pending?.state ?? '',
        codeVerifier: pending?.codeVerifier ?? '',
        nonce: pending?.nonce ?? '',
        userAgent: request.get('user-agent')?.slice(0, 300) ?? null,
      });
      setCustomerSessionCookies(
        response,
        result.sessionToken,
        result.expiresAt,
        this.env.isProduction,
      );
      response.redirect(HttpStatus.FOUND, next);
    } catch (error) {
      response.redirect(HttpStatus.FOUND, withAuthError(next, authErrorFor(error)));
    }
  }

  @Get(CUSTOMER_AUTH_ROUTES.me)
  me(@Req() request: Request): Promise<CustomerMeDto> {
    return this.currentCustomer.execute({ sessionToken: readCustomerSessionToken(request) });
  }

  @Put(CUSTOMER_AUTH_ROUTES.profile)
  @UseGuards(CustomerOriginGuard)
  saveProfile(@Body() body: unknown, @Req() request: Request): Promise<CustomerMeDto> {
    return this.updateProfile.execute({
      sessionToken: readCustomerSessionToken(request),
      body,
    });
  }

  @Put(CUSTOMER_AUTH_ROUTES.avatar)
  @UseGuards(CustomerOriginGuard)
  saveAvatar(@Body() body: unknown, @Req() request: Request): Promise<CustomerMeDto> {
    return this.setAvatar.execute({
      sessionToken: readCustomerSessionToken(request),
      body,
    });
  }

  @Delete(CUSTOMER_AUTH_ROUTES.avatar)
  @UseGuards(CustomerOriginGuard)
  deleteAvatar(@Req() request: Request): Promise<CustomerMeDto> {
    return this.removeAvatar.execute({ sessionToken: readCustomerSessionToken(request) });
  }

  @Post(CUSTOMER_AUTH_ROUTES.logout)
  @UseGuards(CustomerOriginGuard)
  async logout(
    @Query('next') nextParam: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.logoutCustomer.execute({ sessionToken: readCustomerSessionToken(request) });
    clearCustomerSessionCookies(response, this.env.isProduction);
    response.redirect(HttpStatus.SEE_OTHER, safeNextPath(nextParam));
  }
}
