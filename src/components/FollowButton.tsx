"use client";
import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  initialFollowing: boolean;
  initialCount: number;
  isLoggedIn: boolean;
  isOwnProfile: boolean;
}

export default function FollowButton({ userId, initialFollowing, initialCount, isLoggedIn, isOwnProfile }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  if (isOwnProfile) return null;
  if (!isLoggedIn) return (
    <a href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[#7a350b] transition-colors">
      <UserPlus className="w-4 h-4" /> Follow
    </a>
  );

  const handleToggle = async () => {
    setLoading(true);
    // Optimistic
    setFollowing((f) => !f);
    setCount((c) => following ? c - 1 : c + 1);

    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setFollowing(data.following);
        setCount(data.followerCount);
      } else {
        // Revert
        setFollowing((f) => !f);
        setCount((c) => following ? c + 1 : c - 1);
      }
    } catch {
      setFollowing((f) => !f);
      setCount((c) => following ? c + 1 : c - 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        following
          ? "bg-[var(--color-bg-soft)] border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-red-400 hover:text-red-500"
          : "bg-[var(--color-primary)] text-white hover:bg-[#7a350b]"
      } disabled:opacity-60`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : following ? (
        <><UserMinus className="w-4 h-4" /> Following</>
      ) : (
        <><UserPlus className="w-4 h-4" /> Follow</>
      )}
    </button>
  );
}
