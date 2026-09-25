import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

let counter = 0;

/** Registers a fresh user; the returned agent keeps its session cookie. */
export async function registerUser(app: INestApplication) {
  const agent: TestAgent = request.agent(app.getHttpServer());
  const email = `user${Date.now()}-${counter++}@lily.test`;
  const res = await agent
    .post('/api/auth/register')
    .send({ email, password: 'password123' })
    .expect(201);
  return {
    agent,
    email,
    user: res.body as { id: string; defaultVaultId: string },
  };
}
