import { UserRole } from '../../users/enums/user-role.enum.js';
import type { AuthUser } from './auth-user.js';

/**
 * Временный пользователь для локальной разработки.
 * Удалите вместе с DevUserGuard, когда появится Google OAuth + JWT.
 */
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

export const DEV_USER: AuthUser = {
  userId: DEV_USER_ID,
  email: 'dev@legko.local',
  role: UserRole.User,
};
