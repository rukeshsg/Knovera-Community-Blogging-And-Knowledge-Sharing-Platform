import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// We need to fetch the post on the server to SSR it for SEO
async function getPost(slug: string) {
  await connectToDatabase();
  const post = await Post.findOne({ slug, isPublished: true }).populate("author", "name image profile");
  if (post) {
    post.views += 1;
    await post.save();
  }
  return post;
}

export default async function PostDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {post.tags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-[var(--color-bg-secondary)] text-[var(--color-primary)] text-xs font-bold rounded-full uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6 text-[var(--color-text-primary)]">
          {post.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
          <Link href={`/profile/${post.author._id}`} className="flex items-center gap-2 hover:text-[var(--color-primary)] transition-colors">
            {post.author.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.image} alt={post.author.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-primary)] font-bold">
                {post.author.name.charAt(0)}
              </div>
            )}
            <span className="font-medium text-[var(--color-text-primary)]">{post.author.name}</span>
          </Link>
          <span>·</span>
          <time dateTime={post.createdAt.toISOString()}>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
          <span>·</span>
          <span>{post.readTime} min read</span>
        </div>
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="w-full h-[400px] sm:h-[500px] relative mb-12 rounded-2xl overflow-hidden shadow-lg border border-[var(--color-bg-secondary)]">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority />
        </div>
      )}

      {/* Content */}
      <article 
        className="prose prose-lg dark:prose-invert prose-headings:font-heading prose-a:text-[var(--color-primary)] prose-img:rounded-xl max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </div>
  );
}
