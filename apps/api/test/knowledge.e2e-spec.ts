import type { INestApplication } from '@nestjs/common';
import { createApp, registerUser } from './helpers.js';

type Agent = Awaited<ReturnType<typeof registerUser>>['agent'];

describe('Links, tags, folders & graph (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  async function note(
    agent: Agent,
    vault: string,
    title: string,
    content = '',
  ) {
    const res = await agent
      .post(`/api/vaults/${vault}/notes`)
      .send({ title, content })
      .expect(201);
    return res.body as { id: string; title: string };
  }

  it('indexes wikilinks, resolves them late and exposes backlinks', async () => {
    const { agent, user } = await registerUser(app);
    const vault = user.defaultVaultId;
    const a = await note(agent, vault, 'A', 'Voir [[B]] et [[c|la note C]]');
    const b = await note(agent, vault, 'B', 'Retour vers [[A]]');

    const outgoing = await agent.get(`/api/notes/${a.id}/links`).expect(200);
    expect(outgoing.body).toEqual([
      { targetTitle: 'b', targetNoteId: b.id },
      { targetTitle: 'c', targetNoteId: null },
    ]);

    // Creating "C" resolves the dangling link.
    const c = await note(agent, vault, 'C');
    const backlinks = await agent
      .get(`/api/notes/${c.id}/backlinks`)
      .expect(200);
    expect(backlinks.body.map((n: { title: string }) => n.title)).toEqual([
      'A',
    ]);

    const graph = await agent.get(`/api/vaults/${vault}/graph`).expect(200);
    expect(graph.body.nodes).toHaveLength(3);
    expect(graph.body.edges).toHaveLength(2); // A–B (both directions merged) and A–C
    const degreeOfA = graph.body.nodes.find(
      (n: { id: string }) => n.id === a.id,
    ).degree;
    expect(degreeOfA).toBe(2);

    const local = await agent
      .get(`/api/notes/${c.id}/graph?depth=1`)
      .expect(200);
    expect(
      local.body.nodes.map((n: { title: string }) => n.title).sort(),
    ).toEqual(['A', 'C']);
    const deeper = await agent
      .get(`/api/notes/${c.id}/graph?depth=2`)
      .expect(200);
    expect(deeper.body.nodes).toHaveLength(3);

    // Deleting the target keeps the link, unresolved.
    await agent.delete(`/api/notes/${c.id}`).expect(204);
    const after = await agent.get(`/api/notes/${a.id}/links`).expect(200);
    expect(after.body[1]).toEqual({ targetTitle: 'c', targetNoteId: null });
  });

  it('rewrites references when a note is renamed', async () => {
    const { agent, user } = await registerUser(app);
    const vault = user.defaultVaultId;
    const target = await note(agent, vault, 'Old name');
    const source = await note(
      agent,
      vault,
      'Source',
      'See [[Old name]], [[old name|alias]] and `[[Old name]]`',
    );

    const renamed = await agent
      .patch(`/api/notes/${target.id}`)
      .send({ title: 'New name' })
      .expect(200);
    expect(renamed.body.updatedReferences).toBe(1);

    const updated = await agent.get(`/api/notes/${source.id}`).expect(200);
    expect(updated.body.content).toBe(
      'See [[New name]], [[New name|alias]] and `[[Old name]]`',
    );
    const backlinks = await agent
      .get(`/api/notes/${target.id}/backlinks`)
      .expect(200);
    expect(backlinks.body.map((n: { id: string }) => n.id)).toEqual([
      source.id,
    ]);
  });

  it('extracts tags and filters notes by tag', async () => {
    const { agent, user } = await registerUser(app);
    const vault = user.defaultVaultId;
    const one = await note(agent, vault, 'One', 'about #Docker and #infra');
    await note(agent, vault, 'Two', 'more #docker');

    const tags = await agent.get(`/api/vaults/${vault}/tags`).expect(200);
    expect(tags.body).toEqual([
      { name: 'docker', noteCount: 2 },
      { name: 'infra', noteCount: 1 },
    ]);
    const tagged = await agent
      .get(`/api/vaults/${vault}/notes?tag=docker&sort=title`)
      .expect(200);
    expect(tagged.body.map((n: { title: string }) => n.title)).toEqual([
      'One',
      'Two',
    ]);

    await agent
      .patch(`/api/notes/${one.id}`)
      .send({ content: 'no more tags' })
      .expect(200);
    const after = await agent.get(`/api/vaults/${vault}/tags`).expect(200);
    expect(after.body).toEqual([{ name: 'docker', noteCount: 1 }]);
  });

  it('organizes notes in folders', async () => {
    const { agent, user } = await registerUser(app);
    const vault = user.defaultVaultId;
    const parent = await agent
      .post(`/api/vaults/${vault}/folders`)
      .send({ name: 'Cours' })
      .expect(201);
    const child = await agent
      .post(`/api/vaults/${vault}/folders`)
      .send({ name: 'React', parentId: parent.body.id })
      .expect(201);

    await agent
      .patch(`/api/folders/${parent.body.id}`)
      .send({ parentId: child.body.id })
      .expect(400);

    const n = await note(agent, vault, 'Hooks');
    await agent
      .patch(`/api/notes/${n.id}`)
      .send({ folderId: child.body.id })
      .expect(200);
    const inFolder = await agent
      .get(`/api/vaults/${vault}/notes?folderId=${child.body.id}`)
      .expect(200);
    expect(inFolder.body.map((x: { id: string }) => x.id)).toEqual([n.id]);

    await agent.delete(`/api/folders/${child.body.id}`).expect(409);
    await agent
      .patch(`/api/notes/${n.id}`)
      .send({ folderId: null })
      .expect(200);
    await agent.delete(`/api/folders/${child.body.id}`).expect(204);

    const renamed = await agent
      .patch(`/api/folders/${parent.body.id}`)
      .send({ name: 'Formations' })
      .expect(200);
    expect(renamed.body).toMatchObject({ name: 'Formations', parentId: null });

    const other = await registerUser(app);
    await agent
      .patch(`/api/notes/${n.id}`)
      .send({ folderId: parent.body.id })
      .expect(200);
    await agent
      .post(`/api/vaults/${other.user.defaultVaultId}/notes`)
      .send({ title: 'x', folderId: parent.body.id })
      .expect(404);
  });

  it('keeps sibling folder names unique', async () => {
    const { agent, user } = await registerUser(app);
    const folders = `/api/vaults/${user.defaultVaultId}/folders`;
    const root = await agent
      .post(folders)
      .send({ name: 'Projets' })
      .expect(201);
    await agent.post(folders).send({ name: 'Projets' }).expect(409);

    const child = await agent
      .post(folders)
      .send({ name: 'Projets', parentId: root.body.id })
      .expect(201);
    await agent
      .post(folders)
      .send({ name: 'Projets', parentId: root.body.id })
      .expect(409);

    const other = await agent
      .post(folders)
      .send({ name: 'Archives' })
      .expect(201);
    await agent
      .patch(`/api/folders/${other.body.id}`)
      .send({ name: 'Projets' })
      .expect(409);
    // Moving it next to a same-named folder is refused too.
    await agent
      .patch(`/api/folders/${child.body.id}`)
      .send({ parentId: null })
      .expect(409);
  });
});
