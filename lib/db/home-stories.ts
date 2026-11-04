import { db } from './client';
import { researchPapers } from './schema';
import { desc } from 'drizzle-orm';

export async function getDBPosts(page: number, perPage: number) {
  const offset = (page - 1) * perPage;
  const papers = await db.select().from(researchPapers).limit(perPage).offset(offset).orderBy(desc(researchPapers.createdAt));
  const mapped = papers.map(p => ({
    id: p.id,
    title: p.title || '',
    excerpt: p.abstract || '',
    date: p.publicationDate ? new Date(p.publicationDate).toISOString().split('T')[0] : '',
    author: 'Auto-scraper',
    source: p.journalName || 'Database',
    url: p.doi ? `https://doi.org/${p.doi}` : '',
    guid: p.doi || p.id,
    image: '',
    post_name: p.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
  }));
  return { posts: mapped, totalPages: Math.ceil(papers.length / perPage), currentPage: page, total: papers.length };
}
