import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthUser } from './auth-user.js';

/**
 * Достаёт пользователя, которого положил guard.
 *
 * Использование:
 *   @CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();

    if (!request.user) {
      throw new InternalServerErrorException(
        'CurrentUser требует DevUserGuard или JwtAuthGuard',
      );
    }

    return request.user;
  },
);
