import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Weight } from './entities/weight.entity.js';

export interface WeightView {
  date: string;
  weight: number;
  updatedAt: Date;
}

@Injectable()
export class WeightsService {
  constructor(
    @InjectRepository(Weight) private readonly weights: Repository<Weight>,
  ) {}

  async list(userId: string, from: string, to: string): Promise<WeightView[]> {
    const rows = await this.weights.find({
      where: { userId, date: Between(from, to) },
      order: { date: 'ASC' },
    });

    return rows.map((row) => this.toView(row));
  }

  async upsert(
    userId: string,
    date: string,
    weight: number,
  ): Promise<WeightView> {
    await this.weights.upsert({ userId, date, weight }, ['userId', 'date']);

    const saved = await this.weights.findOneBy({ userId, date });
    if (!saved) {
      throw new InternalServerErrorException('Не удалось сохранить вес');
    }

    return this.toView(saved);
  }

  /**
   * DELETE идемпотентен: если записи нет, это не ошибка.
   */
  async remove(userId: string, date: string): Promise<void> {
    await this.weights.delete({ userId, date });
  }

  private toView(weight: Weight): WeightView {
    return {
      date: weight.date,
      weight: weight.weight,
      updatedAt: weight.updatedAt,
    };
  }
}
