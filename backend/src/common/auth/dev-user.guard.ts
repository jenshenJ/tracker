import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthUser } from './auth-user.js';
import { DEV_USER } from './dev-user.js';

/**
 * Заглушка вместо JwtAuthGuard.
 *
 * Кладёт в request.user фиксированного dev-пользователя. В production
 * отказывает, чтобы заглушку нельзя было случайно задеплоить.
 */
@Injectable()
export class DevUserGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException('Аутентификация ещё не реализована');
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    request.user = DEV_USER;
    return true;
  }
}
