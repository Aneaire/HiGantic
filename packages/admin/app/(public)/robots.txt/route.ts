export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://higantic.com";

  const body = `User-agent: *
Allow: /blog
Disallow: /defaults
Disallow: /manage-blog
Disallow: /blog-categories
Disallow: /sign-in
Disallow: /sign-up

Sitemap: ${baseUrl}/sitemap.xml`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
