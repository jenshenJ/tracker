import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const date = '2099-01-01';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await request(app.getHttpServer()).delete(`/api/v1/weights/${date}`);
    await app.close();
  });

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.info.database.status).toBe('up');
      });
  });

  it('GET /api/v1', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('rejects an invalid date', () => {
    return request(app.getHttpServer())
      .put('/api/v1/weights/not-a-date')
      .send({ weight: 80 })
      .expect(400);
  });

  it('rejects a non-positive weight', () => {
    return request(app.getHttpServer())
      .put(`/api/v1/weights/${date}`)
      .send({ weight: -1 })
      .expect(400);
  });

  it('handles the weight lifecycle', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/weights/${date}`)
      .send({ weight: 80.5 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.date).toBe(date);
        expect(body.weight).toBe(80.5);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/weights?from=${date}&to=${date}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({ date, weight: 80.5 }),
        ]);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/weights/${date}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/v1/weights/${date}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/weights?from=${date}&to=${date}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([]);
      });
  });
});
