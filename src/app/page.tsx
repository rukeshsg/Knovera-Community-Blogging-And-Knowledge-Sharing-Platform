import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";
import Link from "next/link";
import Image from "next/image";

async function getRecentPosts() {
  await connectToDatabase();
  const posts = await Post.find({ isPublished: true })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate("author", "name image");
  return posts;
}

export default async function Home() {
  const posts = await getRecentPosts();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[var(--color-primary-soft)] to-[var(--background)] py-20 px-4 text-center">
        <h1 className="text-5xl lg:text-7xl font-heading font-bold text-[var(--color-primary)] mb-6">
          Where Ideas Connect and Grow.
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10">
          Discover stories, thinking, and expertise from writers on any topic.
        </p>
        <Link href="/signup" className="px-8 py-4 bg-[var(--color-primary)] text-white font-medium rounded-full hover:bg-[var(--color-primary-soft)] transition-colors shadow-lg text-lg">
          Start Reading
        </Link>
      </section>

      {/* Feed Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h2 className="text-3xl font-heading font-bold mb-10 flex items-center gap-4">
          <span className="w-8 h-1 bg-[var(--color-primary)] rounded-full"></span>
          Latest from Knovera
        </h2>
        
        {posts.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[var(--color-bg-secondary)] rounded-2xl">
            <h3 className="text-2xl font-heading font-bold text-[var(--color-text-primary)] mb-2">No posts yet</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">Be the first to share your knowledge with the community!</p>
            <Link href="/write" className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-soft)] font-medium">
              Write a Story
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post: any) => (
              <Link href={`/post/${post.slug}`} key={post._id.toString()} className="group flex flex-col bg-[var(--color-bg-soft)] rounded-2xl overflow-hidden border border-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] hover:shadow-xl transition-all duration-300">
                <div className="relative h-56 w-full bg-[var(--color-bg-secondary)] overflow-hidden">
                  {post.coverImage ? (
                    <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)] font-heading text-2xl font-bold opacity-30">
                      Knovera
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {post.tags.slice(0, 2).map((tag: string) => (
                      <span key={tag} className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)]/10 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-xl font-heading font-bold mb-3 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">{post.title}</h3>
                  
                  {/* Extract pure text snippet from HTML for description */}
                  <p className="text-[var(--color-text-secondary)] text-sm line-clamp-3 mb-6 flex-1">
                    {post.content.replace(/<[^>]*>?/gm, "").substring(0, 150)}...
                  </p>
                  
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--color-bg-secondary)]">
                    {post.author.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.author.image} alt={post.author.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-primary)] font-bold text-xs">
                        {post.author.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{post.author.name}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{new Date(post.createdAt).toLocaleDateString()} · {post.readTime} min read</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
