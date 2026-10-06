// Serves the Critical Business School typeface (Atlas Grotesk) from criticalbusinessschool.com on this origin,
// since that site sends no CORS headers for its font files.
const FILES = new Set([
  "Atlas-Grotesk-Regular.woff2",
  "Atlas-Grotesk-Bold.woff2",
]);

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!FILES.has(file)) return new Response("Not found", { status: 404 });
  const res = await fetch(`https://www.criticalbusinessschool.com/assets/b/fonts/${file}`, { next: { revalidate: 86400 } });
  if (!res.ok) return new Response("Font unavailable", { status: 502 });
  return new Response(await res.arrayBuffer(), {
    headers: { "Content-Type": "font/woff2", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
