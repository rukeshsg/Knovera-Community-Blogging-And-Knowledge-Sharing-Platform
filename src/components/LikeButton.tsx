"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";

interface Props {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isLoggedIn: boolean;
}

export default function LikeButton({ postId, initialLiked, initialCount, isLoggedIn }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (!isLoggedIn || loading) return;
    setLoading(true);
    // Optimistic update
    setLiked((prev) => !prev);
    setCount((prev) => liked ? prev - 1 : prev + 1);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setCount(data.count);
      } else {
        // Revert on failure
        setLiked((prev) => !prev);
        setCount((prev) => liked ? prev + 1 : prev - 1);
      }
    } catch {
      setLiked((prev) => !prev);
      setCount((prev) => liked ? prev + 1 : prev - 1);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-red-400 hover:text-red-500 transition-colors text-sm font-medium">
        <Heart className="w-4 h-4" />
        {count > 0 && <span>{count}</span>}
      </Link>
    );
  }

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-medium ${
        liked
          ? "bg-red-50 dark:bg-red-950/20 border-red-300 text-red-500"
          : "border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-red-400 hover:text-red-500"
      }`}
    >
      <Heart className={`w-4 h-4 transition-transform ${liked ? "fill-red-500 scale-110" : ""}`} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
