import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore | Knovera",
  description: "Discover stories, ideas, and knowledge from writers on any topic.",
};

interface SearchParams { q?: string; tag?: string; page?: string; }

async function searchPosts(query: string, tag: string, page: number = 1) {
  const limit = 12;
  const skip = (page - 1) * limit;
  
  await connectToDatabase();

  const filter: any = { isPublished: true };
  if (tag) filter.tags = { $in: [tag] };
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { content: { $regex: query, $options: "i" } },
    ];
  }

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name image")
      .lean(),
    Post.countDocuments(filter)
  ]);

  return { 
    posts, 
    total, 
    totalPages: Math.ceil(total / limit),
    currentPage: page
  };
}

async function getAllTags() {
  await connectToDatabase();
  // Get tags from the last 100 published posts to show trending/relevant ones
  const posts = await Post.find({ isPublished: true })
    .sort({ createdAt: -1 })
    .limit(100)
    .select("tags")
    .lean();
    
  const tagSet = new Set<string>();
  posts.forEach((p: any) => p.tags?.forEach((t: string) => tagSet.add(t)));
  return Array.from(tagSet).slice(0, 25);
}

export default async function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams.q ?? "";
  const tag = searchParams.tag ?? "";
  const page = parseInt(searchParams.page ?? "1");

  const [{ posts, totalPages, currentPage, total }, allTags] = await Promise.all([
    searchPosts(q, tag, page), 
    getAllTags()
  ]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-heading font-black text-[var(--color-text-primary)] mb-6">Explore</h1>
          {/* Search Bar */}
          <form method="GET" action="/explore" className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search stories, topics, or keywords..."
              className="w-full pl-12 pr-4 py-4 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-2xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all shadow-sm text-lg"
            />
            {tag && <input type="hidden" name="tag" value={tag} />}
          </form> form
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Posts Grid */}
          <div className="flex-1">
            {(q || tag) && (
              <div className="mb-8 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-soft)] px-4 py-2 rounded-full border border-[var(--color-bg-secondary)]">
                  Found <span className="font-black text-[var(--color-text-primary)]">{total}</span> results
                  {q && <> for <span className="font-bold text-[var(--color-primary)]">"{q}"</span></>}
                  {tag && <> in <span className="font-bold text-[var(--color-primary)]">#{tag}</span></>}
                </p>
                <Link href="/explore" className="text-xs font-bold text-[var(--color-primary)] hover:underline uppercase tracking-wider">Clear all filters</Link>
              </div>
            )}

            {posts.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-[var(--color-bg-secondary)] rounded-3xl bg-[var(--color-bg-soft)]/30">
                <div className="w-20 h-20 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-[var(--color-text-secondary)]" />
                </div>
                <p className="text-2xl font-heading font-black mb-2 text-[var(--color-text-primary)]">No matches found</p>
                <p className="text-[var(--color-text-secondary)] max-w-xs mx-auto">Try broadening your search or exploring a different topic.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {posts.map((post: any) => (
                    <Link href={`/post/${post.slug}`} key={post._id.toString()} className="group flex flex-col bg-[var(--background)] rounded-3xl overflow-hidden border border-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] hover:shadow-xl transition-all duration-300">
                      <div className="relative h-48 bg-[var(--color-bg-secondary)] overflow-hidden">
                        {post.coverImage ? (
                          <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)] font-heading font-black text-3xl opacity-10">KNOVERA</div>
                        )}
                        <div className="absolute top-4 left-4 flex gap-2">
                          {post.tags?.slice(0, 1).map((t: string) => (
                            <span key={t} className="text-[10px] uppercase tracking-widest font-black text-white bg-[var(--color-primary)] px-3 py-1 rounded-full shadow-lg">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h2 className="font-heading font-black text-xl text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 mb-4 leading-tight">{post.title}</h2>
                        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-[var(--color-bg-secondary)]">
                          {post.author.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.author.image} alt={post.author.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--color-primary)]/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-xs">{post.author.name.charAt(0)}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{post.author.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-tighter">
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{post.readTime} min read</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                  <div className="mt-16 flex items-center justify-center gap-4">
                    <Link
                      href={`/explore?q=${q}&tag=${tag}&page=${currentPage - 1}`}
                      className={`p-3 rounded-xl border border-[var(--color-bg-secondary)] transition-all ${currentPage > 1 ? 'hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]' : 'opacity-30 pointer-events-none'}`}
                    >
                      <ChevronLeft size={20} />
                    </Link>
                    
                    <div className="flex items-center gap-2">
                      {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1;
                        // Show current, first, last, and neighbors
                        if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                          return (
                            <Link
                              key={p}
                              href={`/explore?q=${q}&tag=${tag}&page=${p}`}
                              className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${currentPage === p ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30' : 'hover:bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                            >
                              {p}
                            </Link>
                          );
                        } else if (p === currentPage - 2 || p === currentPage + 2) {
                          return <span key={p} className="text-[var(--color-text-secondary)]">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <Link
                      href={`/explore?q=${q}&tag=${tag}&page=${currentPage + 1}`}
                      className={`p-3 rounded-xl border border-[var(--color-bg-secondary)] transition-all ${currentPage < totalPages ? 'hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]' : 'opacity-30 pointer-events-none'}`}
                    >
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar: Tags */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-[var(--color-bg-soft)] border border-[var(--color-bg-secondary)] rounded-3xl p-6 sticky top-24 shadow-sm">
              <h3 className="font-heading font-black text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-6">Trending Topics</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.length > 0 ? allTags.map((t) => (
                  <Link
                    key={t}
                    href={`/explore?tag=${t}`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      tag === t
                        ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                        : "bg-[var(--background)] border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:shadow-sm"
                    }`}
                  >
                    #{t}
                  </Link>
                )) : (
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed italic">The world hasn't started talking yet. Be the first to publish a story.</p>
                )}
              </div>
              {tag && (
                <Link href="/explore" className="mt-8 block text-center text-xs font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest">Reset Filters</Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
