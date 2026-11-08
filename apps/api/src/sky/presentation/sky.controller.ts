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
  UseGuards,
} from '@nestjs/common';
import {
  AddSkyBondUseCase,
  AddSkyQuestionUseCase,
  AskSkyUseCase,
  DeleteSkyBondUseCase,
  DeleteSkyDataUseCase,
  GetCurrentCustomerUseCase,
  GetSkyDataUseCase,
  MarkSkyDayUseCase,
  SaveSkyProfileUseCase,
} from '@antrina/application';
import {
  type AskSkyResponse,
  type SkyBondDto,
  type SkyDataResponse,
  type SkyDayDto,
  type SkyProfileDto,
  type SkyQuestionDto,
} from '@antrina/contracts';
import { type Request } from 'express';
import { AskRateLimitGuard } from './ask-rate-limit.guard.js';
import { CustomerOriginGuard } from '../../customer-auth/presentation/customer-origin.guard.js';
import { readCustomerSessionToken } from '../../customer-auth/presentation/customer-session.cookie.js';

/** "Tu cielo" del cliente con sesión. La tienda reenvía `/cielo-api/*` desde su dominio. */
@Controller('cielo-api/sky')
export class SkyController {
  constructor(
    @Inject(GetCurrentCustomerUseCase) private readonly currentCustomer: GetCurrentCustomerUseCase,
    @Inject(GetSkyDataUseCase) private readonly getSky: GetSkyDataUseCase,
    @Inject(SaveSkyProfileUseCase) private readonly saveSky: SaveSkyProfileUseCase,
    @Inject(DeleteSkyDataUseCase) private readonly deleteSky: DeleteSkyDataUseCase,
    @Inject(AddSkyQuestionUseCase) private readonly addQuestion: AddSkyQuestionUseCase,
    @Inject(AddSkyBondUseCase) private readonly addBond: AddSkyBondUseCase,
    @Inject(DeleteSkyBondUseCase) private readonly deleteBond: DeleteSkyBondUseCase,
    @Inject(MarkSkyDayUseCase) private readonly markDay: MarkSkyDayUseCase,
  ) {}

  /** Sin sesión responde 401 (`auth.*`). */
  private async customerId(request: Request): Promise<string> {
    const customer = await this.currentCustomer.execute({
      sessionToken: readCustomerSessionToken(request),
    });
    return customer.id;
  }

  @Get()
  async sky(@Req() request: Request): Promise<SkyDataResponse> {
    return this.getSky.execute(await this.customerId(request));
  }

  @Put()
  @UseGuards(CustomerOriginGuard)
  async saveProfile(@Req() request: Request, @Body() body: unknown): Promise<SkyProfileDto> {
    return this.saveSky.execute(await this.customerId(request), body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CustomerOriginGuard)
  async forget(@Req() request: Request): Promise<void> {
    await this.deleteSky.execute(await this.customerId(request));
  }

  @Post('questions')
  @UseGuards(CustomerOriginGuard)
  async question(@Req() request: Request, @Body() body: unknown): Promise<SkyQuestionDto> {
    return this.addQuestion.execute(await this.customerId(request), body);
  }

  @Post('bonds')
  @UseGuards(CustomerOriginGuard)
  async bond(@Req() request: Request, @Body() body: unknown): Promise<SkyBondDto> {
    return this.addBond.execute(await this.customerId(request), body);
  }

  @Put('days/:day')
  @UseGuards(CustomerOriginGuard)
  async day(
    @Req() request: Request,
    @Param('day') day: string,
    @Body() body: unknown,
  ): Promise<SkyDayDto> {
    return this.markDay.execute(await this.customerId(request), day, body);
  }

  @Delete('bonds/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CustomerOriginGuard)
  async removeBond(@Req() request: Request, @Param('id') id: string): Promise<void> {
    await this.deleteBond.execute(await this.customerId(request), id);
  }
}

/**
 * "Pregunta al cielo" con IA. Sin sesión (también para invitados), solo desde la tienda y con
 * límite de 10 preguntas por minuto e IP: cada respuesta cuesta una llamada al modelo.
 */
@Controller('cielo-api')
export class AskSkyController {
  constructor(@Inject(AskSkyUseCase) private readonly askSky: AskSkyUseCase) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerOriginGuard, AskRateLimitGuard)
  ask(@Body() body: unknown): Promise<AskSkyResponse> {
    return this.askSky.execute(body);
  }
}
