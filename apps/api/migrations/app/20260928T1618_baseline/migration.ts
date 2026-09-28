#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5c69a1c1e2c32c2ae1cb5c08bf987bcebc2a9abb16fb27bd01345d00c8f220b8/contract';
import endContract from '../../snapshots/5c69a1c1e2c32c2ae1cb5c08bf987bcebc2a9abb16fb27bd01345d00c8f220b8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'folders',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('parentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vaultId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'note_links',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceNoteId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetNoteId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('targetTitle', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'note_tags',
        columns: [
          col('noteId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tagId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['noteId', 'tagId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'notes',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('folderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vaultId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tags',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('vaultId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'vaults',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'note_links',
        constraint: 'note_links_sourceNoteId_targetTitle_key',
        columns: ['sourceNoteId', 'targetTitle'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tags',
        constraint: 'tags_vaultId_name_key',
        columns: ['vaultId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'vaults',
        constraint: 'vaults_ownerId_name_key',
        columns: ['ownerId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folders',
        index: 'folders_parentId_idx_6a68f597',
        columns: ['parentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folders',
        index: 'folders_vaultId_idx_5c1e623c',
        columns: ['vaultId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folders',
        index: 'folders_vault_parent_name_1441000c',
        expression: '"vaultId", coalesce("parentId", \'\'), name',
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'note_links',
        index: 'note_links_sourceNoteId_idx_b1bc7620',
        columns: ['sourceNoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'note_links',
        index: 'note_links_targetNoteId_idx_37a5ad18',
        columns: ['targetNoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'note_tags',
        index: 'note_tags_noteId_idx_0612c5b1',
        columns: ['noteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'note_tags',
        index: 'note_tags_tagId_idx_86854244',
        columns: ['tagId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notes',
        index: 'notes_folderId_idx_5985e562',
        columns: ['folderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notes',
        index: 'notes_vaultId_idx_5c1e623c',
        columns: ['vaultId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notes',
        index: 'notes_vault_title_ci_2c3f0462',
        expression: '"vaultId", lower(title)',
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'tags',
        index: 'tags_vaultId_idx_5c1e623c',
        columns: ['vaultId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'vaults',
        index: 'vaults_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folders',
        foreignKey: {
          name: 'folders_vaultId_fkey',
          columns: ['vaultId'],
          references: { schema: 'public', table: 'vaults', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folders',
        foreignKey: {
          name: 'folders_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'folders', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'note_links',
        foreignKey: {
          name: 'note_links_sourceNoteId_fkey',
          columns: ['sourceNoteId'],
          references: { schema: 'public', table: 'notes', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'note_links',
        foreignKey: {
          name: 'note_links_targetNoteId_fkey',
          columns: ['targetNoteId'],
          references: { schema: 'public', table: 'notes', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'note_tags',
        foreignKey: {
          name: 'note_tags_noteId_fkey',
          columns: ['noteId'],
          references: { schema: 'public', table: 'notes', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'note_tags',
        foreignKey: {
          name: 'note_tags_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'tags', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notes',
        foreignKey: {
          name: 'notes_vaultId_fkey',
          columns: ['vaultId'],
          references: { schema: 'public', table: 'vaults', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notes',
        foreignKey: {
          name: 'notes_folderId_fkey',
          columns: ['folderId'],
          references: { schema: 'public', table: 'folders', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tags',
        foreignKey: {
          name: 'tags_vaultId_fkey',
          columns: ['vaultId'],
          references: { schema: 'public', table: 'vaults', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'vaults',
        foreignKey: {
          name: 'vaults_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
