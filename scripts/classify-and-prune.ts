import { db } from '../lib/db/client';
import { researchPapers } from '../lib/db/schema';
import { classifyDinosaur } from '../lib/ai/jev-style';
import { eq } from 'drizzle-orm';

const run = async () => {
  const papers = await db.select().from(researchPapers).limit(30);
  const key = process.env.JEVSTYLE_API_KEY || '';
  if (!key) { console.log('No key'); return; }
  const toDelete: string[] = [];
  for (const p of papers) {
    try {
      const cls = await classifyDinosaur(p.title + ' ' + (p.abstract || ''), key) as any;
      const prob = cls.answers?.dinosaur?.noul ?? cls.questions?.dinosaur?.probability ?? 0;
      console.log(prob.toFixed(3), '|', p.id, '|', p.title?.slice(0, 60));
      if (prob < 0.25) toDelete.push(p.id);
    } catch (e: any) { console.log('ERR', p.id); }
  }
  if (toDelete.length) {
    console.log('Deleting', toDelete.length, 'papers with score < 0.25');
    for (const id of toDelete) {
      await db.delete(researchPapers).where(eq(researchPapers.id, id));
    }
    console.log('Deleted.', toDelete.length);
  } else {
    console.log('Nothing to delete (< 0.25).');
  }
};
run();
