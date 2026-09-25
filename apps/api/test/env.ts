import 'dotenv/config';

// Point the app at the e2e database prepared by global-setup.ts.
const url = new URL(process.env['DATABASE_URL']!);
if (!url.pathname.endsWith('_test')) url.pathname += '_test';
process.env['DATABASE_URL'] = url.toString();
