import { db } from '../lib/db/client';
import { researchPapers } from '../lib/db/schema';

const run = async () => {
  const papers = await db.select().from(researchPapers);
  console.log('DB papers:', papers.length);
  console.log('With DOI:', papers.filter(p => p.doi).length);
  console.log('Without DOI:', papers.filter(p => !p.doi).length);
  const sample = papers.find(p => !p.doi);
  if (sample) console.log('Sample no-DOI title:', sample.title?.slice(0, 50));
};

run();