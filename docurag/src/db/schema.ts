import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

// Users table - synced with Clerk
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    clerkIdIdx: index('idx_users_clerk_id').on(table.clerkId),
    emailIdx: index('idx_users_email').on(table.email),
  })
);

// Document status types
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed';

// Documents table - stores uploaded documents metadata
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    storageUrl: text('storage_url').notNull(),
    status: text('status').$type<DocumentStatus>().notNull().default('uploading'),
    chunkCount: integer('chunk_count').default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_documents_user_id').on(table.userId),
    statusIdx: index('idx_documents_status').on(table.status),
    createdAtIdx: index('idx_documents_created_at').on(table.createdAt),
  })
);

// Chunks table - stores document chunks with embeddings reference
export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    pageNumber: integer('page_number'),
    metadata: jsonb('metadata').$type<{
      page?: number;
      position?: number;
      charStart?: number;
      charEnd?: number;
    }>(),
    vectorId: text('vector_id'), // Reference to Qdrant vector ID
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    documentIdIdx: index('idx_chunks_document_id').on(table.documentId),
    chunkIndexIdx: index('idx_chunks_chunk_index').on(table.chunkIndex),
  })
);

// Source type for query results
export interface QuerySource {
  docId: string;
  chunkId: string;
  score: number;
  page?: number;
  text: string;
  fileName?: string;
}

// Queries table - stores user queries and responses
export const queries = pgTable(
  'queries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    query: text('query').notNull(),
    answer: text('answer'),
    sources: jsonb('sources').$type<QuerySource[]>(),
    confidence: text('confidence').$type<'High' | 'Medium' | 'Low'>(),
    tokenCount: integer('token_count'),
    latencyMs: integer('latency_ms'),
    documentIds: jsonb('document_ids').$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_queries_user_id').on(table.userId),
    createdAtIdx: index('idx_queries_created_at').on(table.createdAt),
  })
);

// Collections table - for organizing documents
export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_collections_user_id').on(table.userId),
  })
);

// Document-Collection relationship
export const documentCollections = pgTable(
  'document_collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    collectionId: uuid('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    documentIdIdx: index('idx_doc_collections_document_id').on(table.documentId),
    collectionIdIdx: index('idx_doc_collections_collection_id').on(table.collectionId),
  })
);

// Types for TypeScript inference
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;
export type Query = typeof queries.$inferSelect;
export type NewQuery = typeof queries.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
