import { ConvexHttpClient } from "convex/browser";
import { api } from "@agent-maker/shared/convex/_generated/api";
import type { Metadata } from "next";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on AI agents, automation, and building intelligent systems with HiGantic.",
};

export const revalidate = 60;

export default async function BlogListingPage() {
  const posts = await convex.query(api.blogPosts.listPublished, {});
  const [featured, ...rest] = posts;

  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Page header */}
      <div className="pt-16 pb-12 border-b border-white/5">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI &amp; Automation
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
          The HiGantic Blog
        </h1>
        <p className="mt-4 text-lg text-zinc-400 max-w-xl">
          Ideas and insight on building autonomous AI agents, workflow
          automation, and the future of intelligent software.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-zinc-500">No posts yet — check back soon.</p>
        </div>
      ) : (
        <div className="py-12">
          {/* Featured post */}
          {featured && (
            <a
              href={`/blog/${featured.slug}`}
              className="group block mb-14"
            >
              <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-black/40">
                {featured.featuredImageUrl ? (
                  <div className="aspect-[2.35/1] overflow-hidden">
                    <img
                      src={featured.featuredImageUrl}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
                  </div>
                ) : (
                  <div className="aspect-[2.35/1] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-400/10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-400/20" />
                    </div>
                  </div>
                )}
                <div
                  className={`p-8 ${featured.featuredImageUrl ? "absolute bottom-0 left-0 right-0" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {featured.category && (
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                        {featured.category.name}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {featured.readingTimeMinutes} min read
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight group-hover:text-zinc-100 transition-colors">
                    {featured.title}
                  </h2>
                  <p
                    className={`mt-2 text-sm leading-relaxed line-clamp-2 ${
                      featured.featuredImageUrl
                        ? "text-zinc-300"
                        : "text-zinc-400"
                    }`}
                  >
                    {featured.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                    <span>{featured.authorName}</span>
                    {featured.publishedAt && (
                      <>
                        <span>·</span>
                        <time
                          dateTime={new Date(
                            featured.publishedAt
                          ).toISOString()}
                        >
                          {new Date(featured.publishedAt).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "long", day: "numeric" }
                          )}
                        </time>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </a>
          )}

          {/* Rest of posts */}
          {rest.length > 0 && (
            <>
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-6">
                More posts
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {rest.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  return (
    <a
      href={`/blog/${post.slug}`}
      className="group block rounded-xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-white/10 overflow-hidden transition-all duration-200"
    >
      {post.featuredImageUrl && (
        <div className="aspect-[2/1] overflow-hidden">
          <img
            src={post.featuredImageUrl}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {post.category && (
            <span className="text-[11px] font-medium text-emerald-400">
              {post.category.name}
            </span>
          )}
          <span className="text-[11px] text-zinc-600">
            {post.readingTimeMinutes} min read
          </span>
        </div>
        <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white leading-snug transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed line-clamp-2">
          {post.excerpt}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-zinc-600">{post.authorName}</span>
          {post.publishedAt && (
            <time
              dateTime={new Date(post.publishedAt).toISOString()}
              className="text-xs text-zinc-600"
            >
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          )}
        </div>
      </div>
    </a>
  );
}
