#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '..', '_data', 'news-posts.json');
const CACHE_PATH = path.join(__dirname, '..', '_data', 'enriched-cache.json');

const PALEONTOLOGY_FEEDS = [
  "https://www.sciencedaily.com/rss/fossils_ruins.xml",
  "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
  "https://bioone.org/journals/acpp/feed",  // index fallback (was RSS)
  "https://www.annualreviews.org/contents/",  // sitemap/index fallback (was RSS)
];

const readJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function extractRSSItems(rssText) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(rssText)) !== null) {
    const itemXml = match[1];
    
    const getTag = (tag) => {
      const patterns = [
        new RegExp(`<${tag}\b[^>]*>([\s\S]*?)<\/${tag}>`, 'i'),
        new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i')
      ];
      for (const p of patterns) {
        const m = itemXml.match(p);
        if (m && m[1]) return m[1].trim();
      }
      return '';
    };
    
    const title = getTag('title');
    const link = getTag('link');
    const pubDate = getTag('pubDate');
    const description = getTag('description');
    const content = getTag('content:encoded') || getTag('content');
    
    if (title && link) {
      items.push({ title, link, pubDate, description, content });
    }
  }
  return items;
}

function parseRSSDate(dateStr) {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function generatePostId(existingPosts) {
  const maxId = existingPosts.reduce((max, p) => Math.max(max, p.id || 0), 0);
  return maxId + 1;
}

async function scrapeArticle(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; DinosauriaBot/1.0; +https://dinosauria.net/bot)' 
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const html = await res.text();
    
    const getMeta = (prop) => {
      const patterns = [
        new RegExp(`<meta\\s+(?:property|name)=["']${prop}["']\\s+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${prop}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) return match[1];
      }
      return null;
    };
    
    const decodeEntities = (str) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
    };
    
    const title = decodeEntities(getMeta('og:title') || getMeta('twitter:title') || 
      (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || '');
    const excerpt = decodeEntities(getMeta('og:description') || getMeta('description') || 
      getMeta('twitter:description') || '');
    const image = getMeta('og:image') || getMeta('twitter:image') || '';
    
    return { title, excerpt, image };
  } catch (err) {
    console.error(`Scrape failed for ${url}:`, err.message);
    return { title: '', excerpt: '', image: '' };
  }
}

async function main() {
  console.log('Starting auto-scrape...');
  
  // Load existing posts
  const existingPosts = readJSON(DATA_PATH);
  const existingGuids = new Set(existingPosts.map(p => p.guid || ''));
  let nextId = generatePostId(existingPosts);
  
  let newPostsCount = 0;
  
  for (const feedUrl of PALEONTOLOGY_FEEDS) {
    const source = { url: feedUrl, type: "rss", source: feedUrl.includes("sciencedaily") ? "sciencedaily" : feedUrl.includes("science.org") ? "science" : "other" };
    console.log(`Processing: ${feedUrl}`);
    try {
      let items = [];
      if (source.type === "rss") {
        const response = await fetch(feedUrl);
        const rssText = await response.text();
        items = extractRSSItems(rssText);
      } else if (source.type === "sitemap") {
        const sitemapUrls = await discoverFromSitemap(feedUrl);
        for (const url of sitemapUrls.slice(0, 5)) {
          try {
            const res = await fetch(url);
            const html = await res.text();
            const foundItems = extractRSSItems(html);
            if (foundItems.length > 0) {
              items.push(...foundItems);
            }
          } catch { }
        }
      } else if (source.type === "index") {
        const indexUrls = await discoverFromIndex(feedUrl);
        for (const url of indexUrls.slice(0, 5)) {
          try {
            const res = await fetch(url);
            const html = await res.text();
            const foundItems = extractRSSItems(html);
            if (foundItems.length > 0) {
              items.push(...foundItems);
            }
          } catch { }
        }
      }
      
      for (const item of items) {
        if (existingGuids.has(item.link)) continue;
        
        const domain = extractDomain(item.link);
        console.log(`  Scraping: ${item.title}`);
        
        const scraped = await scrapeArticle(item.link);
        
        const date = parseRSSDate(item.pubDate);
        const post = {
          id: nextId++,
          post_date: date.toISOString().split('T')[0],
          post_date_gmt: date.toISOString(),
          post_content: scraped.title ? `${scraped.excerpt}\n\nSource: ${item.link}` : item.description,
          post_title: scraped.title || item.title,
          post_excerpt: scraped.excerpt || item.description || item.content || '',
          post_name: slugify(scraped.title || item.title),
          guid: item.link,
          author_id: 1,
          author: 'Auto-scraper',
          syndication_source: domain,
          image: scraped.image || '',
          meta: { scrapedAt: new Date().toISOString() },
        };
        
        existingPosts.push(post);
        existingGuids.add(item.link);
        newPostsCount++;
        
        // Be nice to servers
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`Feed error (${feedUrl}):`, err.message);
    }
  }
  
  // Save updated posts
  writeJSON(DATA_PATH, existingPosts);
  console.log(`\nAdded ${newPostsCount} new posts`);
  console.log(`Total posts: ${existingPosts.length}`);
}

main();