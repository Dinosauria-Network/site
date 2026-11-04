import { db } from '../lib/db/client';

const run = async () => {
  await db.execute(`DELETE FROM research_papers WHERE id IN (
    SELECT id FROM (
      SELECT id, row_number() OVER (PARTITION BY doi ORDER BY created_at DESC) as rn
      FROM research_papers WHERE doi IS NOT NULL
    ) t WHERE rn > 1
  )`);
  console.log('Deleted DOI duplicates');
};
run();