import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "_data", "news-posts.json");
const OUT_PATH = path.join(process.cwd(), "_data", "enriched-cache.json");

async function main() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const posts = JSON.parse(raw);
  const cache = {};
  for (const p of posts) {
    if (p.url || p.guid) cache[String(p.id)] = { ...p, url: p.url || p.guid };
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(cache));
  console.log("Enriched cache written:", OUT_PATH, "entries:", Object.keys(cache).length);
}

main();
