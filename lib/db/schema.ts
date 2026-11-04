import { pgTable, serial, text, timestamp, jsonb, pgEnum, integer, boolean, uuid, index, unique } from 'drizzle-orm/pg-core';

export const peerReviewStatus = pgEnum('peer_review_status', ['peer_reviewed', 'preprint', 'unknown']);
export const retractionStatus = pgEnum('retraction_status', ['not_retracted', 'retracted', 'under_review', 'unknown']);
export const publicationStatus = pgEnum('publication_status', ['draft', 'pending_review', 'approved', 'published', 'rejected', 'archived']);
export const editorialDecision = pgEnum('editorial_decision', ['approve', 'reject', 'request_changes', 'approve_with_notes']);

export const researchPapers = pgTable('research_papers', {
  id: uuid('id').primaryKey().defaultRandom(),
  doi: text('doi'),
  title: text('title').notNull(),
  abstract: text('abstract'),
  publicationDate: timestamp('publication_date'),
  journalName: text('journal_name'),
  publisher: text('publisher'),
  peerReviewStatus: peerReviewStatus('peer_review_status').default('unknown'),
  studyType: text('study_type'),
  researchPopulation: text('research_population'),
  retractionStatus: retractionStatus('retraction_status').default('not_retracted'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('papers_doi_idx').on(table.doi),
  index('papers_date_idx').on(table.publicationDate),
  index('papers_peer_review_idx').on(table.peerReviewStatus),
  unique('papers_doi_unique').on(table.doi),
]);

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  parentId: uuid('parent_id'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('categories_slug_idx').on(table.slug),
  index('categories_parent_idx').on(table.parentId),
]);

export const authors = pgTable('authors', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  orcid: text('orcid'),
  institution: text('institution'),
  profileUrl: text('profile_url'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('authors_orcid_idx').on(table.orcid),
]);

export const paperAuthors = pgTable('paper_authors', {
  paperId: uuid('paper_id').notNull().references(() => researchPapers.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => authors.id, { onDelete: 'cascade' }),
  authorOrder: integer('author_order').notNull(),
}, (table) => [
  index('paper_authors_paper_idx').on(table.paperId),
  index('paper_authors_author_idx').on(table.authorId),
  unique('paper_authors_unique').on(table.paperId, table.authorId),
]);

export const paperCategories = pgTable('paper_categories', {
  paperId: uuid('paper_id').notNull().references(() => researchPapers.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
}, (table) => [
  unique('paper_categories_unique').on(table.paperId, table.categoryId),
]);

export const editorialStories = pgTable('editorial_stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  paperId: uuid('paper_id').references(() => researchPapers.id, { onDelete: 'set null' }),
  headline: text('headline').notNull(),
  deck: text('deck'),
  description: text('description'),
  body: jsonb('body').default({}),
  keyFindings: jsonb('key_findings').default({}),
  limitations: jsonb('limitations').default({}),
  editorialNotes: text('editorial_notes'),
  status: publicationStatus('status').default('draft'),
  publishingMode: text('publishing_mode').default('manual'),
  featured: boolean('featured').default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('stories_slug_idx').on(table.slug),
  index('stories_paper_idx').on(table.paperId),
  index('stories_status_idx').on(table.status),
]);

export const paperSources = pgTable('paper_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id').notNull().references(() => researchPapers.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  externalId: text('external_id').notNull(),
  externalUrl: text('external_url'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
  rawMetadata: jsonb('raw_metadata').default({}),
}, (table) => [
  unique('paper_sources_unique').on(table.sourceName, table.externalId),
  index('sources_paper_idx').on(table.paperId),
]);

export const ingestionRuns = pgTable('ingestion_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull(),
  status: text('status').notNull(),
  recordsDiscovered: integer('records_discovered').default(0),
  recordsImported: integer('records_imported').default(0),
  recordsUpdated: integer('records_updated').default(0),
  errors: text('errors'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id').references(() => researchPapers.id, { onDelete: 'set null' }),
  originalUrl: text('original_url').notNull(),
  storagePath: text('storage_path'),
  caption: text('caption'),
  attribution: text('attribution'),
  licenseName: text('license_name'),
  licenseUrl: text('license_url'),
  copyrightHolder: text('copyright_holder'),
  reuseStatus: text('reuse_status').notNull().default('pending_verification'),
  verifiedAt: timestamp('verified_at'),
}, (table) => [
  index('media_assets_paper_idx').on(table.paperId),
  index('media_assets_reuse_idx').on(table.reuseStatus),
]);

export const editorialReviews = pgTable('editorial_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => editorialStories.id, { onDelete: 'cascade' }),
  reviewerId: uuid('reviewer_id').notNull(),
  decision: editorialDecision('decision'),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('editorial_reviews_story_idx').on(table.storyId),
  index('editorial_reviews_reviewer_idx').on(table.reviewerId),
]);

export const publicationEvents = pgTable('publication_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => editorialStories.id, { onDelete: 'cascade' }),
  userId: uuid('user_id'),
  eventType: text('event_type').notNull(),
  previousStatus: publicationStatus('previous_status'),
  newStatus: publicationStatus('new_status'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('publication_events_story_idx').on(table.storyId),
  index('publication_events_event_idx').on(table.eventType),
]);

export const sourceRegistry = pgTable('source_registry', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceName: text('source_name').notNull().unique(),
  displayName: text('display_name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastRunAt: timestamp('last_run_at'),
  configuration: jsonb('configuration').default({}),
}, (table) => [
  index('source_registry_enabled_idx').on(table.enabled),
]);

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('user_profiles_role_idx').on(table.role),
]);

export const sourceCursors = pgTable('source_cursors', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull().unique(),
  cursor: text('cursor'),
  updatedAt: timestamp('updated_at').defaultNow(),
});