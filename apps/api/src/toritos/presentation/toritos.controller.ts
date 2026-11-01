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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ClaimPieceUseCase,
  GetCurrentCustomerUseCase,
  GetPieceUseCase,
  ListMyToritosUseCase,
  RecordToritoVisitUseCase,
  SavePieceGiftUseCase,
  UpdateToritoIntentionUseCase,
} from '@antrina/application';
import {
  type ClaimPieceRequest,
  type PieceViewDto,
  type SavePieceGiftRequest,
  type ToritoDto,
  type ToritoListResponse,
  type ToritoVisitDto,
  type UpdateToritoRequest,
} from '@antrina/contracts';
import { DomainError } from '@antrina/domain';
import { type Request } from 'express';
import { CustomerOriginGuard } from '../../customer-auth/presentation/customer-origin.guard.js';
import { readCustomerSessionToken } from '../../customer-auth/presentation/customer-session.cookie.js';

/** La tienda reenvía estas rutas desde su dominio para que lleven la cookie de sesión. */
@Controller('establo-api')
export class ToritosController {
  constructor(
    @Inject(GetCurrentCustomerUseCase) private readonly currentCustomer: GetCurrentCustomerUseCase,
    @Inject(GetPieceUseCase) private readonly getPiece: GetPieceUseCase,
    @Inject(SavePieceGiftUseCase) private readonly saveGift: SavePieceGiftUseCase,
    @Inject(ClaimPieceUseCase) private readonly claimPiece: ClaimPieceUseCase,
    @Inject(ListMyToritosUseCase) private readonly listToritos: ListMyToritosUseCase,
    @Inject(UpdateToritoIntentionUseCase)
    private readonly updateIntention: UpdateToritoIntentionUseCase,
    @Inject(RecordToritoVisitUseCase) private readonly recordVisit: RecordToritoVisitUseCase,
  ) {}

  private async customerId(request: Request): Promise<string> {
    const customer = await this.currentCustomer.execute({
      sessionToken: readCustomerSessionToken(request),
    });
    return customer.id;
  }

  /** El QR se puede abrir sin sesión: solo cambia si la pieza es de quien mira. */
  private async optionalCustomerId(request: Request): Promise<string | null> {
    try {
      return await this.customerId(request);
    } catch (error) {
      if (error instanceof DomainError && error.code.startsWith('auth.')) return null;
      throw error;
    }
  }

  @Get('pieces/:code')
  async piece(@Param('code') code: string, @Req() request: Request): Promise<PieceViewDto> {
    return this.getPiece.execute({ code, customerId: await this.optionalCustomerId(request) });
  }

  @Put('pieces/:code/gift')
  @UseGuards(CustomerOriginGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  gift(@Param('code') code: string, @Body() body: SavePieceGiftRequest): Promise<void> {
    return this.saveGift.execute(code, body);
  }

  @Post('pieces/:code/claim')
  @UseGuards(CustomerOriginGuard)
  async claim(
    @Param('code') code: string,
    @Body() body: ClaimPieceRequest,
    @Req() request: Request,
  ): Promise<ToritoDto> {
    return this.claimPiece.execute(code, await this.customerId(request), body);
  }

  @Get('toritos')
  async toritos(@Req() request: Request): Promise<ToritoListResponse> {
    return this.listToritos.execute(await this.customerId(request));
  }

  @Patch('toritos/:id')
  @UseGuards(CustomerOriginGuard)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateToritoRequest,
    @Req() request: Request,
  ): Promise<ToritoDto> {
    return this.updateIntention.execute(id, await this.customerId(request), body);
  }

  @Post('toritos/:id/visit')
  @UseGuards(CustomerOriginGuard)
  async visit(@Param('id') id: string, @Req() request: Request): Promise<ToritoVisitDto> {
    return this.recordVisit.execute(id, await this.customerId(request));
  }
}
