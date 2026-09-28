import type { INestApplication } from '@nestjs/common';
import { createApp, registerUser } from './helpers.js';

describe('Vaults & notes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('manages vaults', async () => {
    const { agent } = await registerUser(app);
    const created = await agent
      .post('/api/vaults')
      .send({ name: '  Travail ' })
      .expect(201);
    expect(created.body).toMatchObject({ name: 'Travail', noteCount: 0 });
    await agent.post('/api/vaults').send({ name: 'Travail' }).expect(409);
    await agent.post('/api/vaults').send({ name: '' }).expect(400);

    const list = await agent.get('/api/vaults').expect(200);
    expect(list.body.map((v: { name: string }) => v.name)).toEqual([
      'Mon vault',
      'Travail',
    ]);

    await agent
      .patch(`/api/vaults/${created.body.id}`)
      .send({ name: 'Boulot' })
      .expect(200);
    await agent.delete(`/api/vaults/${created.body.id}`).expect(204);
    await agent.get(`/api/vaults/${created.body.id}`).expect(404);
  });

  it('runs the note lifecycle', async () => {
    const { agent, user } = await registerUser(app);
    const vault = user.defaultVaultId;

    const first = await agent
      .post(`/api/vaults/${vault}/notes`)
      .send({})
      .expect(201);
    expect(first.body).toMatchObject({
      title: 'Sans titre',
      content: '',
      vaultId: vault,
    });
    const second = await agent
      .post(`/api/vaults/${vault}/notes`)
      .send({})
      .expect(201);
    expect(second.body.title).toBe('Sans titre 2');

    const updated = await agent
      .patch(`/api/notes/${first.body.id}`)
      .send({ title: 'JWT', content: '# JWT\nSigned **tokens**' })
      .expect(200);
    expect(updated.body).toMatchObject({
      title: 'JWT',
      content: '# JWT\nSigned **tokens**',
    });

    await agent
      .patch(`/api/notes/${second.body.id}`)
      .send({ title: 'jwt' })
      .expect(409);
    await agent
      .patch(`/api/notes/${second.body.id}`)
      .send({ title: 'bad [title]' })
      .expect(400);

    const list = await agent.get(`/api/vaults/${vault}/notes`).expect(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].content).toBeUndefined();

    const vaultDto = await agent.get(`/api/vaults/${vault}`).expect(200);
    expect(vaultDto.body.noteCount).toBe(2);

    await agent.delete(`/api/notes/${second.body.id}`).expect(204);
    await agent.get(`/api/notes/${second.body.id}`).expect(404);
  });

  it('searches titles and contents, case-insensitively and literally', async () => {
    const { agent, user } = await registerUser(app);
    const vault = user.defaultVaultId;
    await agent
      .post(`/api/vaults/${vault}/notes`)
      .send({ title: 'Docker', content: 'compose up' });
    await agent
      .post(`/api/vaults/${vault}/notes`)
      .send({ title: 'NestJS', content: 'Modules et DOCKER' });
    await agent
      .post(`/api/vaults/${vault}/notes`)
      .send({ title: 'Stats', content: '100% done' });

    const docker = await agent
      .get(`/api/vaults/${vault}/notes?q=docker`)
      .expect(200);
    expect(docker.body.map((n: { title: string }) => n.title).sort()).toEqual([
      'Docker',
      'NestJS',
    ]);
    const percent = await agent
      .get(`/api/vaults/${vault}/notes?q=%25`)
      .expect(200);
    expect(percent.body.map((n: { title: string }) => n.title)).toEqual([
      'Stats',
    ]);
    const sorted = await agent
      .get(`/api/vaults/${vault}/notes?sort=title`)
      .expect(200);
    expect(sorted.body.map((n: { title: string }) => n.title)).toEqual([
      'Docker',
      'NestJS',
      'Stats',
    ]);
  });

  it("isolates users: B can't see or change A's data", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const note = await a.agent
      .post(`/api/vaults/${a.user.defaultVaultId}/notes`)
      .send({ title: 'Secret', content: 'A only' })
      .expect(201);

    await b.agent.get(`/api/vaults/${a.user.defaultVaultId}`).expect(404);
    await b.agent.get(`/api/vaults/${a.user.defaultVaultId}/notes`).expect(404);
    await b.agent
      .post(`/api/vaults/${a.user.defaultVaultId}/notes`)
      .send({})
      .expect(404);
    await b.agent.get(`/api/notes/${note.body.id}`).expect(404);
    await b.agent
      .patch(`/api/notes/${note.body.id}`)
      .send({ content: 'hacked' })
      .expect(404);
    await b.agent.delete(`/api/notes/${note.body.id}`).expect(404);
    await b.agent.delete(`/api/vaults/${a.user.defaultVaultId}`).expect(404);
    await b.agent.get(`/api/notes/${note.body.id}/backlinks`).expect(404);
    await b.agent.get(`/api/vaults/${a.user.defaultVaultId}/graph`).expect(404);

    const still = await a.agent.get(`/api/notes/${note.body.id}`).expect(200);
    expect(still.body.content).toBe('A only');
    const bVaults = await b.agent.get('/api/vaults').expect(200);
    expect(bVaults.body).toHaveLength(1);
  });
});
