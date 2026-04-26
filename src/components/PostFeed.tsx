"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Heart, Eye, ArrowRight } from "lucide-react";

interface Post {
  _id: string;
  title: string;
  slug: string;
  content: string;
  coverImage?: string;
  tags: string[];
  readTime: number;
  views: number;
  likes: string[];
  createdAt: string;
  author: { _id: string; name: string; image?: string };
}

export default function PostFeed({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 6);
  const observerTarget = useRef(null);

  const fetchMorePosts = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;

    try {
      const res = await fetch(`/api/posts?page=${nextPage}&limit=6`);
      const data = await res.json();

      if (res.ok && data.posts?.length > 0) {
        setPosts((prev) => [...prev, ...data.posts]);
        setPage(nextPage);
        if (data.posts.length < 6) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to fetch more posts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMorePosts();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, hasMore, page, loading]);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post, i) => (
          <Link 
            href={`/post/${post.slug}`} 
            key={`${post._id}-${i}`} 
            className="group flex flex-col bg-[var(--background)] rounded-3xl overflow-hidden border border-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] hover:shadow-2xl transition-all duration-500"
          >
            <div className="relative h-60 w-full bg-[var(--color-bg-secondary)] overflow-hidden">
              {post.coverImage ? (
                <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)] font-heading text-3xl font-black opacity-10 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent">
                  KNOVERA
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className="text-[10px] uppercase tracking-widest font-black text-white bg-[var(--color-primary)] px-3 py-1 rounded-full shadow-lg">
                  {post.tags[0] || "Story"}
                </span>
              </div>
            </div>
            <div className="p-7 flex flex-col flex-1">
              <h3 className="text-xl font-heading font-black mb-4 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight">
                {post.title}
              </h3>
              
              <p className="text-[var(--color-text-secondary)] text-sm line-clamp-3 mb-8 flex-1 leading-relaxed">
                {post.content.replace(/<[^>]*>?/gm, "").substring(0, 160)}...
              </p>
              
              <div className="flex items-center justify-between pt-5 border-t border-[var(--color-bg-secondary)]/50">
                <div className="flex items-center gap-3">
                  {post.author.image ? (
                    <img src={post.author.image} alt={post.author.name} className="w-9 h-9 rounded-xl object-cover ring-2 ring-[var(--color-primary)]/10" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-black text-xs">
                      {post.author.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">{post.author.name}</span>
                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-tighter">
                      {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {post.readTime} min
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[var(--color-text-secondary)] opacity-60">
                   <span className="flex items-center gap-1 text-[10px] font-bold"><Heart size={12} className="text-red-500" /> {post.likes?.length || 0}</span>
                   <span className="flex items-center gap-1 text-[10px] font-bold"><Eye size={12} /> {post.views}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="py-10 flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">Loading more stories...</p>
          </div>
        ) : hasMore ? (
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] opacity-30">Scroll for more</p>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8 px-10 bg-[var(--color-bg-soft)] rounded-3xl border border-[var(--color-bg-secondary)] border-dashed">
             <p className="text-sm font-bold text-[var(--color-text-primary)]">You've reached the end!</p>
             <Link href="/explore" className="flex items-center gap-2 text-xs font-black text-[var(--color-primary)] uppercase tracking-widest hover:gap-3 transition-all">
               Explore more topics <ArrowRight size={14} />
             </Link>
          </div>
        )}
      </div>
    </div>
  );
}
