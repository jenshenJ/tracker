import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevUserGuard } from '../common/auth/dev-user.guard.js';
import { UsersModule } from '../users/users.module.js';
import { Weight } from './entities/weight.entity.js';
import { WeightsController } from './weights.controller.js';
import { WeightsService } from './weights.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Weight]), UsersModule],
  controllers: [WeightsController],
  providers: [WeightsService, DevUserGuard],
})
export class WeightsModule {}
