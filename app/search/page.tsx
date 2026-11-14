import { getAllPosts, getAllGenera } from "@/lib/genus-data";
import Link from "next/link";
import { pageTitle } from "@/lib/site";

export const metadata = {
  title: pageTitle("Search"),
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const term = (sp.q || "").toLowerCase();
  const RESULT_CAP = 50;
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
  const cappedPostResults = postResults.slice(0, RESULT_CAP);
  const cappedGenusResults = genusResults.slice(0, RESULT_CAP);

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
          <h2>News ({postResults.length}{postResults.length > cappedPostResults.length ? ` — showing first ${RESULT_CAP}` : ""})</h2>
          {cappedPostResults.map((p) => (
            <div key={p.id}>
              <Link href={`/news/${p.id}`}>{p.title}</Link>
            </div>
          ))}
          <h2>Genera ({genusResults.length}{genusResults.length > cappedGenusResults.length ? ` — showing first ${RESULT_CAP}` : ""})</h2>
          {cappedGenusResults.map((g) => (
            <div key={g.id}>
              <Link href={`/genus/${g.post_name}`}>{g.post_title}</Link>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
