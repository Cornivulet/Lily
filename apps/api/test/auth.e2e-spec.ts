import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, registerUser } from './helpers.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('registers, reads the session, logs out', async () => {
    const { agent, email, user } = await registerUser(app);
    expect(user.defaultVaultId).toBeDefined();

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body).toEqual({
      id: user.id,
      email,
      createdAt: expect.any(String),
    });
    expect(me.body.passwordHash).toBeUndefined();

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('logs in with the right password only, email case-insensitive', async () => {
    const { email } = await registerUser(app);
    const server = app.getHttpServer();
    await request(server)
      .post('/api/auth/login')
      .send({ email: email.toUpperCase(), password: 'password123' })
      .expect(200)
      .expect('set-cookie', /lily_session=.*HttpOnly/);
    const wrong = await request(server)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    expect(wrong.body.message).toBe('Email ou mot de passe incorrect');
  });

  it('rejects duplicate emails and invalid payloads', async () => {
    const { email } = await registerUser(app);
    const server = app.getHttpServer();
    await request(server)
      .post('/api/auth/register')
      .send({ email, password: 'password123' })
      .expect(409);
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'nope', password: 'short' })
      .expect(400);
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'x@y.z', password: 'password123', admin: true })
      .expect(400);
  });

  it('protects every other route', async () => {
    await request(app.getHttpServer()).get('/api/vaults').expect(401);
  });

  it('changes the password', async () => {
    const { agent, email } = await registerUser(app);
    await agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'bad-password', newPassword: 'new-password' })
      .expect(401);
    await agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'password123', newPassword: 'new-password' })
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'new-password' })
      .expect(200);
  });
});
