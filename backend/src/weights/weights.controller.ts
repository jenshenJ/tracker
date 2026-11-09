import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth/auth-user.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { DevUserGuard } from '../common/auth/dev-user.guard.js';
import {
  isoDateSchema,
  upsertWeightSchema,
  weightRangeQuerySchema,
} from './dto/weights.dto.js';
import type {
  UpsertWeightDto,
  WeightRangeQuery,
} from './dto/weights.dto.js';
import { WeightsService } from './weights.service.js';

@ApiTags('weights')
@ApiBearerAuth()
@UseGuards(DevUserGuard)
@Controller('weights')
export class WeightsController {
  constructor(private readonly weights: WeightsService) {}

  @Get()
  @ApiOperation({ summary: 'Веса за диапазон дат' })
  list(
    @CurrentUser() user: AuthUser,
    @Query({ schema: weightRangeQuerySchema }) query: WeightRangeQuery,
  ) {
    return this.weights.list(user.userId, query.from, query.to);
  }

  @Put(':date')
  @ApiOperation({ summary: 'Поставить или обновить вес за дату' })
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('date', { schema: isoDateSchema }) date: string,
    @Body({ schema: upsertWeightSchema }) body: UpsertWeightDto,
  ) {
    return this.weights.upsert(user.userId, date, body.weight);
  }

  @Delete(':date')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить вес за дату (идемпотентно)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('date', { schema: isoDateSchema }) date: string,
  ): Promise<void> {
    await this.weights.remove(user.userId, date);
  }
}
