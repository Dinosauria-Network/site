import { db } from '../lib/db/client';
import { researchPapers } from '../lib/db/schema';
import { classifyDinosaur } from '../lib/ai/jev-style';

const run = async () => {
  const papers = await db.select().from(researchPapers).limit(20);
  const key = process.env.JEVSTYLE_API_KEY || '';
  if (!key) {
    console.log('No JEVSTYLE_API_KEY — set it to run.');
    return;
  }
  for (const p of papers) {
    try {
      const cls = await classifyDinosaur(p.title + ' ' + (p.abstract || ''), key) as any;
      const prob = cls.answers?.dinosaur?.noul ?? cls.questions?.dinosaur?.probability;
      console.log(`${prob?.toFixed(3)} | ${p.peerReviewStatus} | ${p.title?.slice(0, 70)}`);
    } catch (e: any) {
      console.log('ERROR |', p.title?.slice(0, 70), '|', e.message || e);
    }
  }
};

run();
