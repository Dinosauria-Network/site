export interface TaxonomyTerm {
  term_id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface GenusMeta {
  period?: string;
  author?: string;
  description_date?: number;
  [key: string]: unknown;
}

export interface Genus {
  id: number;
  post_author: number;
  author?: string;
  post_date: string;
  post_date_gmt: string;
  post_content: string | null;
  post_title: string;
  post_excerpt: string | null;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_name: string;
  post_modified: string;
  taxonomy: TaxonomyTerm[];
}

export interface NewsPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  source: string;
  url?: string;
  guid?: string;
  image?: string;
  post_name?: string;
  syndication_source?: string;
}

export interface EnrichedPost extends NewsPost {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  sourceUrl?: string;
  scrapedAt?: string;
}

export interface ScrapedMeta {
  title: string | null;
  excerpt: string | null;
  image: string | null;
  url: string;
}
