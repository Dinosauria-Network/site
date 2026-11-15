import Link from "next/link";

export default function NotFound() {
  return (
    <div className="genus-not-found">
      <h1>Not Found</h1>
      <p>The requested page could not be found.</p>
      <Link href="/">Back to Home</Link>
    </div>
  );
}
