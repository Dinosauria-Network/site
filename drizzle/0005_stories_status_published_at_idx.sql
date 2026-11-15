-- Composite index backing the feed/list query:
--   WHERE status = 'published' ORDER BY published_at DESC, created_at DESC
CREATE INDEX IF NOT EXISTS stories_status_published_at_idx
  ON editorial_stories (status, published_at DESC);
