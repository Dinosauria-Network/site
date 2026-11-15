import { db } from '../lib/db/client';
import { categories } from '../lib/db/schema';

const seed = async () => {
  const items = [
    { name: 'Paleobiology', slug: 'paleobiology', description: 'Fossil organisms and evolutionary history.' },
    { name: 'Geology', slug: 'geology', description: 'Earth processes, stratigraphy, and mineralogy.' },
    { name: 'Ecology', slug: 'ecology', description: 'Species interactions and ecosystems.' },
    { name: 'Evolution', slug: 'evolution', description: 'Natural selection and phylogenetics.' },
    { name: 'Climate Science', slug: 'climate-science', description: 'Paleoclimate and modern climate dynamics.' },
  ];
  for (const item of items) {
    await db.insert(categories).values(item).onConflictDoNothing();
  }
  console.log('Seeded categories.');
};

seed().catch(console.error);
