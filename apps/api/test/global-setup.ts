import { execFileSync } from 'node:child_process';
import 'dotenv/config';
import pg from 'pg';

/**
 * Creates the e2e database if needed and applies the on-disk migrations, so the
 * suite also proves they build the schema the code expects. The e2e suite
 * never touches the development database.
 */
export default async function setup(): Promise<void> {
  const url = new URL(process.env['DATABASE_URL']!);
  const testDb = url.pathname.slice(1) + '_test';
  const testUrl = new URL(url);
  testUrl.pathname = `/${testDb}`;

  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  const exists = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [testDb],
  );
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${testDb}"`);
  await admin.end();

  execFileSync(
    'npx',
    ['prisma', 'db', 'migrate', '--db', testUrl.toString()],
    { stdio: 'ignore' },
  );

  const client = new pg.Client({ connectionString: testUrl.toString() });
  await client.connect();
  await client.query('TRUNCATE users CASCADE');
  await client.end();

  process.env['DATABASE_URL'] = testUrl.toString();
}
