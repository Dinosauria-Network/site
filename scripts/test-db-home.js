import { getDBPosts } from '@/lib/db/home-stories';
import { getPostsPaginated } from '@/lib/genus-data';

async function test() {
  const { posts, totalPages } = await getDBPosts(1, 10);
  console.log('DB posts count:', posts.length);
  console.log('Total pages:', totalPages);
  console.log('First post title:', posts[0]?.title?.slice(0, 30));