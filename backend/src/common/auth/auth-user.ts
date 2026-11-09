import { UserRole } from '../../users/enums/user-role.enum.js';

/**
 * То, что сервисы получают из запроса после аутентификации.
 * Сейчас это заполняет DevUserGuard, позже — JwtStrategy.
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}
