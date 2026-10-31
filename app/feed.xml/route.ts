import RSS from 'rss';
import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/genus-data';

export async function GET() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dinosauria.net';

    const feed = new RSS({
        title: 'The Dinosauria Network',
        description: 'Dispensing your daily dose of dinosaurs',
        feed_url: `${siteUrl}/feed.xml`,
        site_url: siteUrl,
        language: 'en',
        pubDate: new Date().toUTCString(),
        ttl: 60,
    });

    const posts = await getAllPosts();

    posts.forEach((post) => {
        feed.item({
            title: post.title,
            description: post.excerpt,
            url: `${siteUrl}/news/${post.id}`,
            guid: String(post.id),
            date: post.date,
            author: post.author || 'Dinosauria Network',
        });
    });

    return new NextResponse(feed.xml({ indent: true }), {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600'
        },
    });
}