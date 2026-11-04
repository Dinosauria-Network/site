import { classifyDinosaur } from '../lib/ai/jev-style';

const test = async () => {
  const key = process.env.JEVSTYLE_API_KEY || '';
  if (!key || key.startsWith('jev_') === false) {
    console.log('No JEVSTYLE_API_KEY set — skipping live test');
    return;
  }
  const result = await classifyDinosaur('Dinosaur fossil discovery from the Cretaceous period. Study of theropod vertebrae.', key);
  console.log('Jev-Style result:', JSON.stringify(result, null, 2));
};

test();
