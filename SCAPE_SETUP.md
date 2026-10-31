# ScienceDaily RSS Feed Integration

## Working RSS Feed (Only Valid Source)
**ScienceDaily RSS Feed**:  
`https://www.sciencedaily.com/rss/fossils_ruins.xml`

- ✅ Valid RSS 2.0 format  
- ✅ Returns HTTP 200 OK  
- ✅ Contains `<rss>` root element  
- ✅ Regularly updated with new dinosaur/paleontology articles  

## Feeds That No Longer Work

| URL | Status | Reason |
|-------|--------|--------|
| https://phys.org/rss-feed/earth-sciences/paleontology/ | 404 Not Found | URL no longer exists |
| https://www.nature.com/subjects/paleontology.rss | 404 Not Found | URL moved/removed |
| https://www.sciencenews.org/rss/paleontology | 404 Not Found | URL moved/removed |
| https://www.livescience.com/paleontology/rss | 404 Not Found | URL moved/removed |
| https://www.nature.com/rss/paleontology | 404 Not Found | URL moved/removed |
| https://www.sciencemag.org/rss/news_paleontology.xml | 403 Forbidden | Cloudflare anti-bot protection |
| https://www.royalsocietypublishing.org/rsbl | 404 Not Found | Not an RSS feed URL |

## Action Required

1. **Remove all non-ScienceDaily feeds** from `lib/services/data.ts`  
   Keep only: `https://www.sciencedaily.com/rss/fossils_ruins.xml`

2. **Update `app/feed.xml/route.ts`** to use ScienceDaily's `/feed.xml` route instead of `/feed`

3. **Add ScienceDaily to navigation menu** in `components/Navigation.tsx`:
   ```tsx
   { href: "/search", label: "Search" },
   { href: "/science", label: "Science" },  // New RSS feed link
`