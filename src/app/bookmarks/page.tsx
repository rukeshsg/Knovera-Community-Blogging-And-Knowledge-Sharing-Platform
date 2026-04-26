import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Post from "@/models/Post";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookmarkCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks | Knovera",
  description: "Your saved stories and posts.",
};

export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  await connectToDatabase();
  const user = await User.findById(session.user.id).select("bookmarks").lean() as any;
  const bookmarkIds = user?.bookmarks ?? [];

  const posts = bookmarkIds.length
    ? await Post.find({ _id: { $in: bookmarkIds }, isPublished: true })
        .populate("author", "name image")
        .sort({ createdAt: -1 })
        .lean() as any[]
    : [];

  return (
    <div className="min-h-screen bg-[var(--background)] max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-3 mb-10">
        <BookmarkCheck className="w-7 h-7 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading font-black text-[var(--color-text-primary)]">Bookmarks</h1>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[var(--color-bg-secondary)] rounded-2xl">
          <BookmarkCheck className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-heading font-bold mb-2">No bookmarks yet</h3>
          <p className="text-[var(--color-text-secondary)] mb-6">Save stories you want to read later by clicking the bookmark icon.</p>
          <Link href="/explore" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[#7a350b] transition-colors">
            Explore Stories
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <Link href={`/post/${post.slug}`} key={post._id.toString()} className="group flex gap-4 p-4 bg-[var(--color-bg-soft)] rounded-2xl border border-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] hover:shadow-md transition-all">
              {post.coverImage && (
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--color-bg-secondary)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-bold text-lg text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 mb-1">{post.title}</h2>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2">{post.content.replace(/<[^>]*>?/gm, "").substring(0, 120)}...</p>
                <div className="flex items-center gap-2">
                  {post.author.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.author.image} alt={post.author.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-primary)] font-bold text-xs">
                      {post.author.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs text-[var(--color-text-secondary)] font-medium">{post.author.name}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">· {post.readTime} min read</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
