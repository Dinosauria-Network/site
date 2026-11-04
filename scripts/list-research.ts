import { db } from '../lib/db/client';
import { researchPapers } from '../lib/db/schema';

const list = async () => {
  const papers = await db.select().from(researchPapers).limit(20);
  for (const p of papers) {
    console.log(p.id, '|', p.peerReviewStatus, '|', p.title?.slice(0, 80), '| DOI:', p.doi);
  }
  console.log('Total papers in DB:', papers.length);
};

list();
