import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEV_USER_ID } from '../common/auth/dev-user.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './enums/user-role.enum.js';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Пока нет авторизации, создаём одного dev-пользователя, чтобы
   * внешние ключи (например, weights.user_id) работали локально.
   */
  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      return;
    }

    await this.users.save(
      this.users.create({
        id: DEV_USER_ID,
        email: 'dev@legko.local',
        name: 'Dev User',
        role: UserRole.User,
      }),
    );

    this.logger.log(`Dev user ready: ${DEV_USER_ID}`);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }
}
