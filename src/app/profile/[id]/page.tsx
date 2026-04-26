import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Post from "@/models/Post";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import FollowButton from "@/components/FollowButton";
import { Globe, Globe2, Code2, BookOpen, Eye, Heart, Users, UserCheck, FileEdit } from "lucide-react";
import type { Metadata } from "next";

async function getUserData(id: string, isOwnProfile: boolean, tab: string) {
  await connectToDatabase();
  const user = await User.findById(id).lean() as any;
  if (!user) return null;

  const query: any = { author: id };
  if (tab === "drafts" && isOwnProfile) {
    query.isPublished = false;
  } else {
    query.isPublished = true;
  }

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .lean() as any[];

  return { user, posts };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  await connectToDatabase();
  const user = await User.findById(id).lean() as any;
  if (!user) return { title: "Profile Not Found" };
  return {
    title: `${user.name} | Knovera`,
    description: user.profile?.bio || `${user.name}'s profile on Knovera.`,
  };
}

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "published" } = await searchParams;
  const session = await getServerSession(authOptions);
  const isOwnProfile = session?.user?.id === id;
  
  const data = await getUserData(id, isOwnProfile, tab);
  if (!data) notFound();

  const { user, posts } = data;
  const isFollowing = session?.user?.id
    ? user.followers?.some((fId: any) => fId.toString() === session.user.id)
    : false;

  // Stats should always reflect published posts
  const publishedPostsCount = await Post.countDocuments({ author: id, isPublished: true });
  // We can optimize this by adding stats to the user model or separate query, but for now:
  const publishedPosts = await Post.find({ author: id, isPublished: true }).select("views likes").lean();
  const totalViews = publishedPosts.reduce((acc: number, p: any) => acc + (p.views || 0), 0);
  const totalLikes = publishedPosts.reduce((acc: number, p: any) => acc + (p.likes?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Cover */}
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[#7a350b] h-48 relative">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-16">
        {/* Profile Card */}
        <div className="bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-[var(--background)] shadow-lg flex-shrink-0">
              {user.image ? (
                <Image src={user.image} alt={user.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--color-primary)] flex items-center justify-center text-white text-3xl font-black">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-heading font-black text-[var(--color-text-primary)]">{user.name}</h1>
                  <p className="text-[var(--color-text-secondary)] text-sm mt-0.5">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isOwnProfile ? (
                    <Link href="/settings" className="px-4 py-2 text-sm font-semibold border border-[var(--color-bg-secondary)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors">
                      Edit Profile
                    </Link>
                  ) : (
                    <>
                      <FollowButton
                        userId={id}
                        initialFollowing={isFollowing}
                        initialCount={user.followers?.length ?? 0}
                        isLoggedIn={!!session}
                        isOwnProfile={isOwnProfile}
                      />
                      <Link
                        href={`/messages?with=${id}`}
                        className="px-4 py-2 text-sm font-semibold border border-[var(--color-bg-secondary)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors"
                      >
                        Message
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {user.profile?.bio && (
                <p className="text-[var(--color-text-secondary)] mt-3 text-sm leading-relaxed max-w-xl">
                  {user.profile.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mt-3">
                {user.profile?.socialLinks?.website && (
                  <a href={user.profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
                {user.profile?.socialLinks?.twitter && (
                  <a href={`https://twitter.com/${user.profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                    <Globe2 className="w-3.5 h-3.5" /> @{user.profile.socialLinks.twitter}
                  </a>
                )}
                {user.profile?.socialLinks?.github && (
                  <a href={`https://github.com/${user.profile.socialLinks.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                    <Code2 className="w-3.5 h-3.5" /> {user.profile.socialLinks.github}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--color-bg-secondary)]">
            {[
              { label: "Stories", value: publishedPostsCount, icon: <BookOpen className="w-4 h-4" /> },
              { label: "Followers", value: user.followers?.length ?? 0, icon: <Users className="w-4 h-4" /> },
              { label: "Following", value: user.following?.length ?? 0, icon: <UserCheck className="w-4 h-4" /> },
              { label: "Total Likes", value: totalLikes, icon: <Heart className="w-4 h-4" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-[var(--color-text-secondary)] mb-1">{icon}<span className="text-xs">{label}</span></div>
                <p className="text-xl font-black text-[var(--color-text-primary)]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        {isOwnProfile && (
          <div className="flex border-b border-[var(--color-bg-secondary)] mb-6">
            <Link 
              href={`/profile/${id}?tab=published`}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'published' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Published ({publishedPostsCount})
            </Link>
            <Link 
              href={`/profile/${id}?tab=drafts`}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'drafts' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Drafts
            </Link>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-[var(--color-bg-secondary)] rounded-2xl">
              <p className="text-[var(--color-text-secondary)]">
                {tab === 'drafts' ? "No drafts found." : (isOwnProfile ? "You haven't published any stories yet." : "No stories published yet.")}
              </p>
              {isOwnProfile && tab === 'published' && (
                <Link href="/write" className="mt-4 inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[#7a350b] transition-colors">
                  Write Your First Story
                </Link>
              )}
            </div>
          ) : (
            posts.map((post: any) => (
              <div key={post._id.toString()} className="group relative bg-[var(--color-bg-soft)] rounded-2xl border border-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] hover:shadow-md transition-all overflow-hidden">
                <Link href={post.isPublished ? `/post/${post.slug}` : `/write?edit=${post.slug}`} className="flex gap-4 p-4">
                  {post.coverImage && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">{post.title}</h3>
                      {!post.isPublished && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full">Draft</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2">{post.content.replace(/<[^>]*>?/gm, "").substring(0, 120)}...</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>· {post.readTime} min read</span>
                      {post.isPublished && (
                        <>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes?.length ?? 0}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
                {isOwnProfile && (
                  <Link 
                    href={`/write?edit=${post.slug}`}
                    className="absolute top-4 right-4 p-2 bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all"
                    title="Edit Story"
                  >
                    <FileEdit size={16} />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
