import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndWeights1794300000000 implements MigrationInterface {
  name = 'CreateUsersAndWeights1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create extension if not exists "pgcrypto"`);

    await queryRunner.query(
      `create type "user_role" as enum ('user', 'trainer', 'admin')`,
    );

    await queryRunner.query(`
      create table "users" (
        "id" uuid primary key default gen_random_uuid(),
        "email" text not null unique,
        "name" text,
        "avatar_url" text,
        "role" "user_role" not null default 'user',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      )
    `);

    await queryRunner.query(`
      create table "weights" (
        "user_id" uuid not null references "users"("id") on delete cascade,
        "date" date not null,
        "weight" double precision not null,
        "updated_at" timestamptz not null default now(),
        primary key ("user_id", "date"),
        constraint "weights_positive" check ("weight" > 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists "weights"`);
    await queryRunner.query(`drop table if exists "users"`);
    await queryRunner.query(`drop type if exists "user_role"`);
  }
}
