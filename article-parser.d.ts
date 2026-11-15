declare module 'article-parser' {
  export function extract(url: string, html?: string, options?: any): Promise<{
    title?: string;
    description?: string;
    content?: string;
    image?: string;
    images?: string[];
    url: string;
  }>;
}
