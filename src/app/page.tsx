import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import PostFeed from "@/components/PostFeed";
import { ArrowRight, Sparkles } from "lucide-react";

async function getRecentPosts() {
  await connectToDatabase();
  const posts = await Post.find({ isPublished: true })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate("author", "name image")
    .lean();
  
  // Serialize for client component
  return posts.map((p: any) => ({
    ...p,
    _id: p._id.toString(),
    author: { ...p.author, _id: p.author._id.toString() },
    likes: p.likes.map((id: any) => id.toString()),
    createdAt: p.createdAt.toISOString(),
  }));
}

export default async function Home() {
  const posts = await getRecentPosts();
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      {/* Hero Section — premium dark theme with better visuals */}
      <section className="relative py-24 px-4 text-center overflow-hidden border-b border-[var(--color-bg-secondary)]">
        {/* Background image with dark overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale-[0.3]"
          style={{ backgroundImage: "url('/assets/auth-bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-[var(--background)]" />
        
        <div className="relative max-w-4xl mx-auto z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 text-white/90 font-black text-[10px] mb-8 border border-white/10 uppercase tracking-[0.2em] backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
            Empowering the next generation of writers
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-heading font-black text-white mb-6 tracking-tighter leading-[0.9]">
            Where Ideas<br /><span className="text-[var(--color-primary)]">Ignite.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            Join a vibrant community of thinkers and creators. Share your unique perspective with the world and discover stories that matter.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {session ? (
              <Link href="/write" className="group relative inline-flex items-center gap-3 px-10 py-4 bg-[var(--color-primary)] text-white font-black rounded-2xl hover:bg-[#7a350b] transition-all shadow-2xl shadow-[var(--color-primary)]/40 text-lg overflow-hidden">
                <span className="relative z-10">Start Writing</span>
                <ArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="group relative inline-flex items-center gap-3 px-10 py-4 bg-[var(--color-primary)] text-white font-black rounded-2xl hover:bg-[#7a350b] transition-all shadow-2xl shadow-[var(--color-primary)]/40 text-lg">
                  Get Started
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/explore" className="inline-block px-10 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all border border-white/10 backdrop-blur-sm text-lg">
                  Browse Feed
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feed Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="text-4xl font-heading font-black text-[var(--color-text-primary)] mb-2">Featured Stories</h2>
            <p className="text-[var(--color-text-secondary)] font-bold uppercase tracking-widest text-xs opacity-60">Trending now in the community</p>
          </div>
          <Link href="/explore" className="flex items-center gap-2 text-sm font-black text-[var(--color-primary)] uppercase tracking-widest hover:gap-3 transition-all pb-1 border-b-2 border-transparent hover:border-[var(--color-primary)]">
            Explore All Topics <ArrowRight size={14} />
          </Link>
        </div>
        
        {posts.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-[var(--color-bg-secondary)] rounded-[40px] bg-[var(--color-bg-soft)]/30">
            <h3 className="text-3xl font-heading font-black text-[var(--color-text-primary)] mb-4">The canvas is blank</h3>
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto font-medium">Be the pioneer. Share your first story and inspire others to follow.</p>
            <Link href="/write" className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--color-primary)] text-white rounded-2xl hover:bg-[#7a350b] font-black transition-all shadow-lg">
              Create First Post
            </Link>
          </div>
        ) : (
          <PostFeed initialPosts={posts as any} />
        )}
      </section>
    </div>
  );
}
