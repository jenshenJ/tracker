import { Repository } from 'typeorm';
import { Weight } from './entities/weight.entity.js';
import { WeightsService } from './weights.service.js';

describe('WeightsService', () => {
  const repository = {
    find: vi.fn(),
    upsert: vi.fn(),
    findOneBy: vi.fn(),
    delete: vi.fn(),
  };

  let service: WeightsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WeightsService(
      repository as unknown as Repository<Weight>,
    );
  });

  it('lists weights ordered by date', async () => {
    repository.find.mockResolvedValue([
      {
        userId: 'user-1',
        date: '2026-01-01',
        weight: 80,
        updatedAt: new Date('2026-01-01T10:00:00Z'),
      },
    ]);

    const result = await service.list('user-1', '2026-01-01', '2026-01-31');

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        date: expect.anything(),
      },
      order: { date: 'ASC' },
    });
    expect(result).toEqual([
      {
        date: '2026-01-01',
        weight: 80,
        updatedAt: new Date('2026-01-01T10:00:00Z'),
      },
    ]);
  });

  it('upserts a weight and returns the saved row', async () => {
    repository.upsert.mockResolvedValue({});
    repository.findOneBy.mockResolvedValue({
      userId: 'user-1',
      date: '2026-01-01',
      weight: 80.5,
      updatedAt: new Date('2026-01-01T10:00:00Z'),
    });

    const result = await service.upsert('user-1', '2026-01-01', 80.5);

    expect(repository.upsert).toHaveBeenCalledWith(
      { userId: 'user-1', date: '2026-01-01', weight: 80.5 },
      ['userId', 'date'],
    );
    expect(result.weight).toBe(80.5);
  });

  it('deletes a weight idempotently', async () => {
    repository.delete.mockResolvedValue({ affected: 0 });

    await expect(
      service.remove('user-1', '2026-01-01'),
    ).resolves.toBeUndefined();
  });
});
