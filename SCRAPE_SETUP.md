# Auto-Scrape Setup Guide

## Run manually
```bash
npm run scrape          # One-time run
```

## Schedule daily scraping (30 min past midnight by default)

### macOS (terminal)
```bash
crontab -e
# Add line:
0 6 * * * cd /Users/alex/Sites/Dinosauria-Network/site && npm run scrape >> /tmp/scrape-cron.log 2>&1
```

### Linux
```bash
# Add line:
0 6 * * * cd /path/to/site && npm run scrape >> /var/log/scrape-cron.log 2>&1
```

### Docker
```bash
docker exec -d <container> sh -c 'cd /app && npm run scrape'
```

## What the scraper does
1. Reads RSS feeds from curated list (`lib/services/data.ts`)
2. Extracts new article URLs
3. Scrapes each article for richer content
4. Adds new posts to `_data/news-posts.json` with:
   - Generated IDs
   - Slugified titles (`post_name`)
   - Date from RSS
   - Source domain from feed URL
   - Scraped metadata in `meta` field
   - Minimal `image` from scraped OG data

## Cron interval
- Default: every day at 6 AM UTC
- Adjust timezone as needed
- If rate limits affect API access, reduce frequency (e.g., daily instead of 6 AM)

## Check results
```bash
npm run build            # Static site builds from updated JSON
curl https://dinosauria.network/api/genus   # Verify new posts visible
```
