import { z } from 'zod';

export const isoDateSchema = z.iso.date();

export const weightRangeQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((query) => query.from <= query.to, {
    message: 'from не может быть позже to',
    path: ['from'],
  });

export type WeightRangeQuery = z.infer<typeof weightRangeQuerySchema>;

export const upsertWeightSchema = z.object({
  weight: z.number().positive().max(500),
});

export type UpsertWeightDto = z.infer<typeof upsertWeightSchema>;
