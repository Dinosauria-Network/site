import { z } from 'zod';

export const StoryStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'published',
  'rejected',
  'archived',
]);

export const EditorialStorySchema = z.object({
  slug: z.string().min(1).max(255),
  headline: z.string().min(1).max(500),
  deck: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  body: z.any().optional(),
  status: StoryStatusSchema,
  featured: z.boolean().default(false),
  publishingMode: z.string().default('manual'),
});

export const PeerReviewSchema = z.enum([
  'peer_reviewed',
  'preprint',
  'unknown',
]);

export const RetractionSchema = z.enum([
  'not_retracted',
  'retracted',
  'under_review',
  'unknown',
]);

export const ResearchPaperSchema = z.object({
  doi: z.string().optional(),
  title: z.string(),
  abstract: z.string().optional(),
  publicationDate: z.string().optional(),
  journalName: z.string().optional(),
  publisher: z.string().optional(),
  peerReviewStatus: PeerReviewSchema,
  studyType: z.string().optional(),
  researchPopulation: z.string().optional(),
  retractionStatus: RetractionSchema,
  metadata: z.any().optional(),
});