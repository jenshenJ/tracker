import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('weights')
@Check('weights_positive', '"weight" > 0')
export class Weight {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Postgres date приходит строкой YYYY-MM-DD — не превращаем в Date.
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ type: 'double precision' })
  weight: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
