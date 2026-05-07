import { api } from "@agent-maker/shared/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, BookOpen, Clock3, Radio } from "lucide-react";
import { Link } from "react-router";

type BlogCategory = {
  name: string;
  slug: string;
} | null;

type BlogPostSummary = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl: string | null;
  category: BlogCategory;
  authorName: string;
  publishedAt?: number;
  readingTimeMinutes: number;
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
];

export function meta() {
  return [
    { title: "HiGantic Blog" },
    {
      name: "description",
      content:
        "Field notes on AI agents, automation, memory, tools, and building useful autonomous workflows.",
    },
  ];
}

export default function BlogPage() {
  const posts = useQuery(api.blogPosts.listPublished, {}) as
    | BlogPostSummary[]
    | undefined;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <BlogNav />
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <Radio className="h-3.5 w-3.5" />
              Field notes
            </div>
            <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tight text-zinc-50 sm:text-6xl">
              Practical writing for agents that do real work.
            </h1>
          </div>
          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-base leading-8 text-zinc-400 sm:text-lg">
              HiGantic Blog covers the details behind persistent memory, tool
              design, automated workflows, and the operating habits that make AI
              agents reliable enough for daily use.
            </p>
          </div>
        </div>
      </section>

      {posts === undefined ? (
        <BlogSkeleton />
      ) : posts.length === 0 ? (
        <EmptyBlog />
      ) : (
        <PostIndex posts={posts} />
      )}
    </main>
  );
}

function BlogNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-emerald-400/20 bg-emerald-400/10">
            <img src="/logo.png" alt="HiGantic" className="h-5 w-5 object-contain" />
          </span>
          <span>HiGantic</span>
        </Link>
        <div className="flex items-center gap-5 text-sm text-zinc-500">
          <Link to="/docs" className="hidden transition-colors hover:text-zinc-200 sm:block">
            Docs
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white"
          >
            Build an agent
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function PostIndex({ posts }: { posts: BlogPostSummary[] }) {
  const [featured, ...rest] = posts;

  return (
    <section className="border-t border-zinc-800/70">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <Link
          to={`/blog/${featured.slug}`}
          className="group grid overflow-hidden border border-zinc-800 bg-zinc-900/35 transition-colors hover:border-zinc-700 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="relative min-h-[320px] overflow-hidden lg:min-h-[520px]">
            <img
              src={featured.featuredImageUrl ?? FALLBACK_IMAGES[0]}
              alt=""
              className="h-full w-full object-cover opacity-85 transition-transform duration-700 ease-[var(--ease-quart)] group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />
          </div>
          <article className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <PostMeta post={featured} />
            <div className="mt-16">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Latest
              </p>
              <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-5xl">
                {featured.title}
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
                {featured.excerpt}
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                Read article
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </article>
        </Link>

        {rest.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Recent posts
              </h2>
              <span className="text-xs text-zinc-600">{posts.length} published</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {rest.map((post, index) => (
                <PostRow key={post._id} post={post} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PostRow({ post, index }: { post: BlogPostSummary; index: number }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group grid gap-6 py-8 transition-colors hover:bg-zinc-900/35 sm:grid-cols-[180px_1fr_auto] sm:px-4"
    >
      <div className="aspect-[4/3] overflow-hidden border border-zinc-800 bg-zinc-900">
        <img
          src={post.featuredImageUrl ?? FALLBACK_IMAGES[(index + 1) % FALLBACK_IMAGES.length]}
          alt=""
          className="h-full w-full object-cover opacity-80 transition-transform duration-500 ease-[var(--ease-quart)] group-hover:scale-[1.04]"
        />
      </div>
      <article>
        <PostMeta post={post} />
        <h3 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-zinc-100 group-hover:text-white">
          {post.title}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
          {post.excerpt}
        </p>
      </article>
      <div className="hidden items-center text-zinc-700 transition-colors group-hover:text-emerald-300 sm:flex">
        <ArrowRight className="h-5 w-5" />
      </div>
    </Link>
  );
}

function PostMeta({ post }: { post: BlogPostSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
      {post.category && (
        <span className="font-medium text-emerald-300">{post.category.name}</span>
      )}
      {post.publishedAt && (
        <time dateTime={new Date(post.publishedAt).toISOString()}>
          {formatDate(post.publishedAt)}
        </time>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="h-3.5 w-3.5" />
        {post.readingTimeMinutes} min read
      </span>
    </div>
  );
}

function BlogSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden border border-zinc-800 bg-zinc-900/30 lg:grid-cols-2">
        <div className="min-h-[360px] animate-pulse bg-zinc-900" />
        <div className="space-y-6 p-8">
          <div className="h-3 w-44 animate-pulse bg-zinc-800" />
          <div className="h-12 w-4/5 animate-pulse bg-zinc-800" />
          <div className="h-20 w-full animate-pulse bg-zinc-800" />
          <div className="h-4 w-32 animate-pulse bg-zinc-800" />
        </div>
      </div>
    </section>
  );
}

function EmptyBlog() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-6">
      <BookOpen className="mx-auto h-9 w-9 text-zinc-700" />
      <h2 className="mt-5 text-2xl font-semibold text-zinc-100">No posts published yet.</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-500">
        Published posts from the HiGantic admin will appear here automatically.
      </p>
    </section>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}
