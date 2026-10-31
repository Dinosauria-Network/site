# Dinosauria Network Site

Next.js site for Dinosauria Network. Uses bundled JSON data (`_data/`) and static generation.

## Setup

cp .env.example .env.local
npm install
npm run dev

## Build

npm run build
npm start

## Data

Posts: _data/news-posts.json
Genera: _data/genus-data.json
Scraping: lib/article-scraper.ts (requires external URL access)
# Build / Test
