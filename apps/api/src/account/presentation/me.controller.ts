import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  type AccountPrincipal,
  AddSkyBondUseCase,
  AddSkyQuestionUseCase,
  DeleteSkyBondUseCase,
  DeleteSkyDataUseCase,
  GetCurrentAccountUseCase,
  GetSkyDataUseCase,
  ListMyOrdersUseCase,
  SaveSkyProfileUseCase,
  toAccountDto,
} from '@antrina/application';
import {
  type MeResponse,
  type MyOrdersResponse,
  type SkyBondDto,
  type SkyDataResponse,
  type SkyProfileDto,
  type SkyQuestionDto,
} from '@antrina/contracts';
import { type IdentityProvider } from '@antrina/domain';
import { type Request, type Response } from 'express';
import { APP_ENV, type AppEnv } from '../../config/env.js';
import { IDENTITY_PROVIDER } from '../account.tokens.js';
import { AccountOriginGuard, AccountSessionGuard, CurrentAccount } from './account.guards.js';
import { readAccountToken, setAccountCookie } from './account-session.cookie.js';

/** Cuenta de la persona: quién es, su "Tu cielo" guardado y sus compras. */
@Controller('me')
@UseGuards(AccountOriginGuard)
export class MeController {
  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(IDENTITY_PROVIDER) private readonly identity: IdentityProvider,
    @Inject(GetCurrentAccountUseCase) private readonly current: GetCurrentAccountUseCase,
    @Inject(GetSkyDataUseCase) private readonly getSky: GetSkyDataUseCase,
    @Inject(SaveSkyProfileUseCase) private readonly saveSky: SaveSkyProfileUseCase,
    @Inject(DeleteSkyDataUseCase) private readonly deleteSky: DeleteSkyDataUseCase,
    @Inject(AddSkyQuestionUseCase) private readonly addQuestion: AddSkyQuestionUseCase,
    @Inject(AddSkyBondUseCase) private readonly addBond: AddSkyBondUseCase,
    @Inject(DeleteSkyBondUseCase) private readonly deleteBond: DeleteSkyBondUseCase,
    @Inject(ListMyOrdersUseCase) private readonly myOrders: ListMyOrdersUseCase,
  ) {}

  /** Siempre 200: `account` es null sin sesión (así la tienda no llena la consola de 401). */
  @Get()
  async me(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MeResponse> {
    const token = readAccountToken(request);
    const principal = await this.current.execute({ sessionToken: token });
    if (principal?.renewedUntil && token) {
      setAccountCookie(response, this.env, token, principal.renewedUntil);
    }
    return {
      account: principal ? toAccountDto(principal.account) : null,
      googleEnabled: this.identity.isConfigured(),
    };
  }

  @Get('sky')
  @UseGuards(AccountSessionGuard)
  sky(@CurrentAccount() me: AccountPrincipal): Promise<SkyDataResponse> {
    return this.getSky.execute(me.account.id);
  }

  @Put('sky')
  @UseGuards(AccountSessionGuard)
  saveProfile(
    @CurrentAccount() me: AccountPrincipal,
    @Body() body: unknown,
  ): Promise<SkyProfileDto> {
    return this.saveSky.execute(me.account.id, body);
  }

  @Delete('sky')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccountSessionGuard)
  async forget(@CurrentAccount() me: AccountPrincipal): Promise<void> {
    await this.deleteSky.execute(me.account.id);
  }

  @Post('sky/questions')
  @UseGuards(AccountSessionGuard)
  question(@CurrentAccount() me: AccountPrincipal, @Body() body: unknown): Promise<SkyQuestionDto> {
    return this.addQuestion.execute(me.account.id, body);
  }

  @Post('sky/bonds')
  @UseGuards(AccountSessionGuard)
  bond(@CurrentAccount() me: AccountPrincipal, @Body() body: unknown): Promise<SkyBondDto> {
    return this.addBond.execute(me.account.id, body);
  }

  @Delete('sky/bonds/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccountSessionGuard)
  async removeBond(@CurrentAccount() me: AccountPrincipal, @Param('id') id: string) {
    await this.deleteBond.execute(me.account.id, id);
  }

  @Get('orders')
  @UseGuards(AccountSessionGuard)
  async orders(@CurrentAccount() me: AccountPrincipal): Promise<MyOrdersResponse> {
    return { data: await this.myOrders.execute(me.account) };
  }
}
