import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('pings the database with a timeout', async () => {
    const withTimeout = vi.fn().mockResolvedValue({
      database: { status: 'up' },
    });
    const pingCheck = vi.fn().mockReturnValue({ withTimeout });
    const check = vi.fn(async (indicators: Array<() => unknown>) => {
      for (const indicator of indicators) {
        await indicator();
      }
      return { status: 'ok' };
    });

    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      { pingCheck } as unknown as TypeOrmHealthIndicator,
    );

    const result = await controller.check();

    expect(check).toHaveBeenCalledTimes(1);
    expect(pingCheck).toHaveBeenCalledWith('database');
    expect(withTimeout).toHaveBeenCalledWith(1500);
    expect(result).toEqual({ status: 'ok' });
  });
});
