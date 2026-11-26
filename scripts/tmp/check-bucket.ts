import { createBrowserClient } from "@supabase/ssr";

async function main() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: buckets, error } = await supabase.storage.listBuckets();
  console.log("Buckets:", JSON.stringify(buckets, null, 2));
  console.log("Error:", error);
}
main();
