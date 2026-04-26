"use client";
import { useState } from "react";
import { UserPlus, UserMinus, Clock, Loader2 } from "lucide-react";

type FollowState = "none" | "following" | "requested";

interface Props {
  userId: string;
  initialState: FollowState;
  initialCount: number;
  isLoggedIn: boolean;
  isOwnProfile: boolean;
}

export default function FollowButton({
  userId,
  initialState,
  initialCount,
  isLoggedIn,
  isOwnProfile,
}: Props) {
  const [state, setState] = useState<FollowState>(initialState);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  if (isOwnProfile) return null;

  if (!isLoggedIn) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[#7a350b] transition-colors shadow-md"
      >
        <UserPlus className="w-4 h-4" /> Follow
      </a>
    );
  }

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setState(data.state as FollowState);
        setCount(data.followerCount);
      }
    } catch (err) {
      console.error("Follow toggle failed", err);
    } finally {
      setLoading(false);
    }
  };

  const stateConfig = {
    none: {
      label: "Follow",
      icon: <UserPlus className="w-4 h-4" />,
      className: "bg-[var(--color-primary)] text-white hover:bg-[#7a350b] shadow-md",
    },
    following: {
      label: "Following",
      icon: <UserMinus className="w-4 h-4" />,
      className:
        "bg-[var(--color-bg-soft)] border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-red-400 hover:text-red-500",
    },
    requested: {
      label: "Requested",
      icon: <Clock className="w-4 h-4" />,
      className:
        "bg-[var(--color-bg-soft)] border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-red-400 hover:text-red-500",
    },
  };

  const config = stateConfig[state];

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={state === "requested" ? "Click to cancel request" : state === "following" ? "Click to unfollow" : "Follow this user"}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${config.className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : config.icon}
      {!loading && config.label}
      {state !== "none" && !loading && (
        <span className="text-xs opacity-60 font-normal">({count})</span>
      )}
    </button>
  );
}
