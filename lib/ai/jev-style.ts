export async function classifyDinosaur(content: string, apiKey: string): Promise<any> {
  const res = await fetch('https://api.jevstyle.com/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state: content.slice(0, 4000),
      questions: {
        dinosaur: {
          type: 'noul',
          instructions: 'The research is about dinosaurs, dinosauromorphs, the mesozoic era, or non-avian avialans.',
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`JevStyle error: ${res.status}`);
  return await res.json() as { questions: { dinosaur: { probability: number } } };
}
