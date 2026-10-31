import { getAllPosts, getAllGenera } from "@/lib/genus-data";
import Link from "next/link";

export const metadata = {
  title: "Search - Dinosauria Network",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const term = (sp.q || "").toLowerCase();
  const posts = getAllPosts();
  const genera = getAllGenera();

  const postResults = term
    ? posts.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(term) ||
          (p.excerpt || "").toLowerCase().includes(term)
      )
    : posts;
  const genusResults = term
    ? genera.filter(
        (g) =>
          (g.post_title || "").toLowerCase().includes(term) ||
          (g.post_content || "").toLowerCase().includes(term)
      )
    : genera;

  return (
    <div className="search-page">
      <h1>Search</h1>
      <form method="GET" action="/search">
        <input
          type="text"
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Search news, genera..."
        />
        <button type="submit">Search</button>
      </form>
      {term && (
        <>
          <h2>News ({postResults.length})</h2>
          {postResults.map((p) => (
            <div key={p.id}>
              <Link href={`/news/${p.id}`}>{p.title}</Link>
            </div>
          ))}
          <h2>Genera ({genusResults.length})</h2>
          {genusResults.map((g) => (
            <div key={g.id}>
              <Link href={`/genus/${g.post_name}`}>{g.post_title}</Link>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
