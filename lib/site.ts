/**
 * Canonical site identity — the one place the site name, tagline and URL live.
 * Everything else derives from these constants (or from getSiteMetadata(),
 * which derives from them). URL comes from NEXT_PUBLIC_SITE_URL with the
 * production domain as fallback; always trailing-slash-free.
 * 
 * GA4: set NEXT_PUBLIC_GA_MEASUREMENT_ID in your environment to enable
 * page-view tracking. Leave unset to omit GA entirely (no runtime error).
 */
const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dinosauria.net';

export const SITE_URL = rawUrl.replace(/\/+$/, '');
export const SITE_NAME = 'Dinosauria Network';
export const SITE_TAGLINE = 'Dispensing your daily dose of dinosaurs';
export const SITE_DESCRIPTION = SITE_TAGLINE;
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Page <title>: `<page> - Dinosauria Network` */
export const pageTitle = (page: string) => `${page} - ${SITE_NAME}`;
