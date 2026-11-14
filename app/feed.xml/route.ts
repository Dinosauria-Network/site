import RSS from 'rss';
import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/genus-data';
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from '@/lib/site';

// Revalidate every 20 min — must be in sync with the CDN s-maxage below.
export const revalidate = 1200;

export async function GET() {
    const feed = new RSS({
        title: SITE_NAME,
        description: SITE_TAGLINE,
        feed_url: `${SITE_URL}/feed.xml`,
        site_url: SITE_URL,
        language: 'en',
        pubDate: new Date().toUTCString(),
        ttl: 60,
    });

    const posts = await getAllPosts();

    posts.forEach((post) => {
        feed.item({
            title: post.title,
            description: post.excerpt,
            url: `${SITE_URL}/news/${post.id}`,
            guid: String(post.id),
            date: post.date,
            author: post.author || SITE_NAME,
        });
    });

    return new NextResponse(feed.xml({ indent: true }), {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600'
        },
    });
}