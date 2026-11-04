import { europePmcAdapter } from '../lib/ingestion/europe-pmc';
import { arxivAdapter } from '../lib/ingestion/arxiv';
import { crossrefAdapter } from '../lib/ingestion/crossref';

const test = async () => {
  for (const a of [europePmcAdapter, arxivAdapter, crossrefAdapter]) {
    try {
      const res = await a.discover();
      console.log(a.sourceName, 'records:', res.records.length, 'done:', res.done, 'nextCursor:', res.nextCursor?.slice(0, 20));
      if (res.records[0]) console.log('  sample title:', res.records[0].title?.slice(0, 60));
    } catch (e: any) {
      console.log(a.sourceName, 'ERROR:', e.message || e);
    }
  }
};

test();
