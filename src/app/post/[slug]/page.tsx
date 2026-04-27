import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import CommentsSection from "@/components/CommentsSection";
import LikeButton from "@/components/LikeButton";
import { BookmarkButton, ShareButton } from "@/components/PostActions";
import FollowButton from "@/components/FollowButton";
import { Eye, Clock, Tag } from "lucide-react";
import type { Metadata } from "next";

async function getPost(slug: string) {
  await connectToDatabase();
  const post = await Post.findOne({ slug, isPublished: true })
    .populate("author", "name image profile");
  if (post) {
    post.views += 1;
    await post.save();
  }
  return post;
}

async function getComments(postId: string) {
  const comments = await Comment.find({ post: postId, isDeleted: false })
    .populate("author", "name image")
    .sort({ createdAt: 1 })
    .lean();

  const topLevel = comments.filter((c) => !c.parentComment);
  const replies = comments.filter((c) => c.parentComment);

  return topLevel.map((c) => ({
    ...c,
    _id: c._id.toString(),
    post: c.post.toString(),
    author: { ...c.author, _id: (c.author as any)._id.toString() },
    likes: c.likes.map((id: any) => id.toString()),
    replies: replies
      .filter((r) => r.parentComment?.toString() === c._id.toString())
      .map((r) => ({
        ...r,
        _id: r._id.toString(),
        post: r.post.toString(),
        author: { ...r.author, _id: (r.author as any)._id.toString() },
        likes: r.likes.map((id: any) => id.toString()),
      })),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const post = await Post.findOne({ slug }).populate("author", "name").lean() as any;
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} | Knovera`,
    description: post.content.replace(/<[^>]*>?/gm, "").substring(0, 155),
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, session] = await Promise.all([getPost(slug), getServerSession(authOptions)]);

  if (!post) notFound();

  const comments = await getComments(post._id.toString());
  const isLiked = session?.user?.id ? post.likes.some((id: any) => id.toString() === session.user.id) : false;
  
  const currentUserId = session?.user?.id ?? "";
  
  let isBookmarked = false;
  let isFollowing = false;
  let hasRequested = false;
  let isOwnProfile = false;

  const authorDoc = await import("@/models/User").then(m => m.default.findById(post.author._id).select("followers followRequestsReceived").lean()) as any;
  
  if (currentUserId) {
    const userDoc = await import("@/models/User").then(m => m.default.findById(currentUserId).select("bookmarks following followRequestsSent").lean()) as any;
    isBookmarked = userDoc?.bookmarks?.some((id: any) => id.toString() === post._id.toString()) ?? false;
    isOwnProfile = currentUserId === post.author._id.toString();
    
    if (authorDoc) {
      isFollowing = authorDoc.followers?.some((fId: any) => fId.toString() === currentUserId);
      hasRequested = authorDoc.followRequestsReceived?.some((fId: any) => fId.toString() === currentUserId);
    }
  }

  const followState: "none" | "following" | "requested" = isFollowing
    ? "following"
    : hasRequested
    ? "requested"
    : "none";

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {post.tags.map((tag: string) => (
            <Link href={`/explore?tag=${tag}`} key={tag} className="flex items-center gap-1 px-3 py-1 bg-[var(--color-bg-secondary)] text-[var(--color-primary)] text-xs font-bold rounded-full uppercase tracking-wider hover:bg-[var(--color-primary)] hover:text-white transition-colors">
              <Tag className="w-3 h-3" />{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-4xl sm:text-5xl font-heading font-black leading-tight mb-6 text-[var(--color-text-primary)]">
        {post.title}
      </h1>

      {/* Author + Meta */}
      <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar - links to profile */}
          <Link href={`/profile/${post.author._id}`} className="hover:opacity-80 transition-opacity flex-shrink-0">
            {post.author.image ? (
              <img src={post.author.image} alt={post.author.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-[var(--color-primary)]/20" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-primary)] font-bold">
                {post.author.name.charAt(0)}
              </div>
            )}
          </Link>
          {/* Author info */}
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/profile/${post.author._id}`} className="font-semibold text-[var(--color-text-primary)] text-sm hover:text-[var(--color-primary)] transition-colors">
                {post.author.name}
              </Link>
              {session?.user?.id === post.author._id.toString() && (
                <Link
                  href={`/write?edit=${post.slug}`}
                  className="text-[10px] uppercase font-bold px-2 py-0.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <time dateTime={post.createdAt.toISOString()}>
                {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </time>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime} min read</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views}</span>
            </div>
          </div>
          
          {!isOwnProfile && (
            <div className="flex items-center gap-2 ml-4 border-l pl-4 border-[var(--color-bg-secondary)]">
              <FollowButton
                userId={post.author._id.toString()}
                initialState={followState}
                initialCount={authorDoc?.followers?.length || 0}
                isLoggedIn={!!session}
                isOwnProfile={isOwnProfile}
              />
              <Link
                href={`/messages?with=${post.author._id.toString()}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-[var(--color-bg-secondary)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors"
              >
                Message
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LikeButton
            postId={post._id.toString()}
            initialLiked={isLiked}
            initialCount={post.likes.length}
            isLoggedIn={!!session}
          />
          <BookmarkButton
            postId={post._id.toString()}
            initialBookmarked={isBookmarked}
            isLoggedIn={!!session}
          />
          <ShareButton title={post.title} slug={post.slug} postId={post._id.toString()} />
        </div>
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="w-full mb-10 rounded-2xl overflow-hidden shadow-lg border border-[var(--color-bg-secondary)] bg-zinc-100 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-auto object-contain block max-h-[80vh]"
          />
        </div>
      )}

      {/* Article Content */}
      <article
        className="prose prose-lg dark:prose-invert prose-headings:font-heading prose-a:text-[var(--color-primary)] prose-img:rounded-xl max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Comments */}
      <CommentsSection postId={post._id.toString()} initialComments={comments as any} />
    </div>
  );
}
