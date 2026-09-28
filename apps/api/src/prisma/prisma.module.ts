import { Global, Module } from '@nestjs/common';
import { db } from './db.js';

/** Injection token for the Prisma Next client. */
export const DB = Symbol('DB');
export type Db = typeof db;
/** Transaction context passed to `db.transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Anything exposing the ORM surface: the client itself or a transaction. */
export type Queryable = Pick<Db, 'orm'> | Pick<Tx, 'orm'>;

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class PrismaModule {}
