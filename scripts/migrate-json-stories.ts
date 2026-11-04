import { db } from '../lib/db/client';
import { editorialStories, researchPapers } from '../lib/db/schema';
import { classifyDinosaur } from '../lib/ai/jev-style';
import fs from 'fs';

interface NewsPost {
  id: number; title?: string; post_title?: string; excerpt?: string; post_excerpt?: string; date?: string; post_date?: string; author?: string; source?: string; syndication_source?: string; url?: string; guid?: string; image?: string;
}

const cleanTitle = (t: string) => t.split(' | ').slice(0, 1).join('').trim();

const parseDate = (d: string): Date | null => { try { const dt = new Date(d); return isNaN(dt.getTime()) ? null : dt; } catch { return null; } };

const run = async () => {
  const raw = JSON.parse(fs.readFileSync('_data/news-posts.json', 'utf-8')) as NewsPost[];
  const key = process.env.JEVSTYLE_API_KEY || '';
  if (!key) { console.log('No JEVSTYLE_API_KEY — set to classify'); return; }
  let kept = 0, skipped = 0;
  for (const post of raw) {
    try {
      const scoreResult = await classifyDinosaur(post.title + ' ' + post.excerpt, key);
      const prob = scoreResult.answers?.dinosaur?.noul ?? scoreResult.questions?.dinosaur?.probability ?? 0;
      const clean = cleanTitle(post.post_title || post.title || '');
      console.log(prob.toFixed(3), '|', clean.slice(0, 70), '|', post.syndication_source || post.source);
      if (prob >= 0.25) {
        await db.insert(researchPapers).values({
          title: (post.post_title || post.title || '').slice(0, 500),
          abstract: (post.post_excerpt || post.excerpt || null) ? (post.post_excerpt || post.excerpt || '').slice(0, 4000) : null,
          publicationDate: parseDate(post.post_date || post.date || ''),
          journalName: 'ScienceDaily',
          peerReviewStatus: 'unknown',
          metadata: { sourcePostId: post.id, sourceUrl: post.url || '', source: post.source || post.syndication_source || '', image: post.image || '' },
        }).onConflictDoNothing();
        kept++;
      } else {
        skipped++;
      }
    } catch (e: any) {
      console.log('ERR', post.title?.slice(0, 50), '|', e.message || e);
      skipped++;
    }
  }
  console.log('Done. Kept:', kept, 'Skipped:', skipped);
};
run();
